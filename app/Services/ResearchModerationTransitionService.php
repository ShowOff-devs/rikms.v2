<?php

namespace App\Services;

use App\Exceptions\ResearchModerationTransitionException;
use App\Models\ArchiveRecord;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\User;
use App\Support\ResearchSlugger;
use App\Support\Statuses;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ResearchModerationTransitionService
{
    public const APPROVE = 'approve';

    public const APPROVE_AND_PUBLISH = 'approve_and_publish';

    public const REJECT = 'reject';

    public const PUBLISH = 'publish';

    public const RETURN_TO_DRAFT = 'return_to_draft';

    public const ARCHIVE = 'archive';

    public const RESTORE = 'restore';

    private const ALLOWED_FROM = [
        self::APPROVE => [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW],
        self::APPROVE_AND_PUBLISH => [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW],
        self::REJECT => [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW],
        self::PUBLISH => ['approved'],
        self::RETURN_TO_DRAFT => ['rejected', Statuses::RESEARCH_UNDER_REVIEW],
        self::ARCHIVE => [Statuses::RESEARCH_PUBLISHED, 'approved', 'rejected'],
        self::RESTORE => [Statuses::RESEARCH_ARCHIVED],
    ];

    private const ILLEGAL_MESSAGES = [
        self::APPROVE => 'Only submitted or under-review research can be approved.',
        self::APPROVE_AND_PUBLISH => 'Only submitted or under-review research can be approved and published.',
        self::REJECT => 'Only submitted or under-review research can be rejected.',
        self::PUBLISH => 'Only approved research can be published.',
        self::RETURN_TO_DRAFT => 'Only rejected or under-review research can be returned to draft.',
        self::ARCHIVE => 'Only published, approved, or rejected research can be archived.',
        self::RESTORE => 'Only archived research can be restored.',
    ];

    public function __construct(private readonly ModerationAuditWriter $auditWriter) {}

    public function transition(Request $request, Research $expectedResearch, string $action): Research
    {
        $actor = $request->user();

        if (! $actor instanceof User) {
            throw new AuthorizationException;
        }

        $this->assertAuthorized($actor, $expectedResearch, $action);
        $transitionId = (string) Str::uuid();

        try {
            $result = DB::transaction(function () use ($request, $expectedResearch, $action, $actor, $transitionId): array {
                $research = Research::query()->lockForUpdate()->findOrFail($expectedResearch->id);

                $this->assertExpectedState($research, $expectedResearch, $action);
                $this->assertAuthorized($actor, $research, $action);
                $this->assertLegalTransition($research, $action);

                $result = match ($action) {
                    self::APPROVE => $this->decide($request, $research, $transitionId, $action, 'approved', 'research.approved', [
                        'approved_at' => now(),
                        'approved_by' => $actor->id,
                    ]),
                    self::APPROVE_AND_PUBLISH => $this->decide($request, $research, $transitionId, $action, Statuses::RESEARCH_PUBLISHED, 'research.approved_published', [
                        'approved_at' => now(),
                        'approved_by' => $actor->id,
                        'published_at' => now(),
                    ]),
                    self::REJECT => $this->decide($request, $research, $transitionId, $action, 'rejected', 'research.rejected'),
                    self::PUBLISH => $this->decide($request, $research, $transitionId, $action, Statuses::RESEARCH_PUBLISHED, 'research.published', [
                        'published_at' => now(),
                    ]),
                    self::RETURN_TO_DRAFT => $this->decide($request, $research, $transitionId, $action, Statuses::RESEARCH_DRAFT, 'research.returned'),
                    self::ARCHIVE => $this->archive($request, $research, $transitionId),
                    self::RESTORE => $this->restore($request, $research, $transitionId),
                    default => throw new ResearchModerationTransitionException(
                        'Unsupported research moderation action.',
                        $research->status,
                    ),
                };

                $this->createNotification($request, $result['research'], $transitionId, $action, $result['decision']);

                return $result;
            }, 3);
        } catch (QueryException $exception) {
            if (! $this->isActiveRevisionConflict($exception)) {
                throw $exception;
            }

            throw new ResearchModerationTransitionException(
                'This archived revision cannot be restored because another active revision already exists.',
                $expectedResearch->status,
                true,
            );
        }

        return Research::query()->findOrFail($result['research']->id);
    }

    private function assertAuthorized(User $actor, Research $research, string $action): void
    {
        $ability = $action === self::RESTORE ? 'restore' : 'moderate';

        if (! $actor->isActive() || ! $actor->can($ability, $research)) {
            throw new AuthorizationException;
        }
    }

    private function isActiveRevisionConflict(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        $message = mb_strtolower($exception->getMessage());

        return in_array($sqlState, ['23000', '23505', '19'], true)
            && (
                str_contains($message, 'research_active_revision_parent_unique')
                || str_contains($message, 'active_revision_parent_id')
            );
    }

    private function assertExpectedState(Research $research, Research $expectedResearch, string $action): void
    {
        $archiveStateChanged = ($research->archived_at === null) !== ($expectedResearch->archived_at === null);

        if ($research->status === $expectedResearch->status && ! $archiveStateChanged) {
            return;
        }

        throw new ResearchModerationTransitionException(
            'This research was changed by another moderation request. Refresh the record before trying again.',
            $research->status,
            true,
        );
    }

    private function assertLegalTransition(Research $research, string $action): void
    {
        $allowedFrom = self::ALLOWED_FROM[$action] ?? [];
        $archiveStateIsValid = $action === self::RESTORE
            ? $research->archived_at !== null
            : $research->archived_at === null;

        if (in_array($research->status, $allowedFrom, true) && $archiveStateIsValid) {
            return;
        }

        throw new ResearchModerationTransitionException(
            self::ILLEGAL_MESSAGES[$action] ?? 'This moderation action is not allowed for the current research status.',
            $research->status,
        );
    }

    /**
     * @param  array<string, mixed>  $extraValues
     * @return array{research: Research, decision: ResearchApproval}
     */
    private function decide(
        Request $request,
        Research $research,
        string $transitionId,
        string $action,
        string $status,
        string $event,
        array $extraValues = [],
    ): array {
        $oldValues = $research->only(['status', 'approved_at', 'approved_by', 'published_at', 'slug']);
        $nextValues = array_merge(['status' => $status], $extraValues);

        if ($status === Statuses::RESEARCH_PUBLISHED) {
            $this->lockPublishParent($research);

            if (! $research->slug && $research->title) {
                $nextValues['slug'] = ResearchSlugger::generateUniqueResearchSlug($research->title, (int) $research->id);
            }
        }

        $research->update($nextValues);

        if ($status === Statuses::RESEARCH_PUBLISHED) {
            $this->supersedePublishParent($request, $research, $transitionId, $action);
        }

        $decision = ResearchApproval::create([
            'research_id' => $research->id,
            'reviewed_by' => $request->user()->id,
            'status' => $status === Statuses::RESEARCH_PUBLISHED ? 'approved' : $status,
            'issue_type' => $action === self::REJECT
                ? ($request->input('issue_type') ?: 'other_manual_review')
                : null,
            'remarks' => $request->input('notes'),
            'reviewed_at' => now(),
        ]);

        $this->auditWriter->record(
            $request,
            $transitionId,
            $event,
            $research,
            $oldValues,
            $research->fresh()->only(['status', 'approved_at', 'approved_by', 'published_at', 'slug']),
            [
                'moderation_action' => $action,
                'decision_id' => $decision->id,
                'notes' => $request->input('notes'),
                'issue_type' => $action === self::REJECT
                    ? ($request->input('issue_type') ?: 'other_manual_review')
                    : null,
            ],
        );

        return ['research' => $research, 'decision' => $decision];
    }

    private function lockPublishParent(Research $research): void
    {
        if (! $research->revision_parent_id) {
            return;
        }

        $parent = Research::query()->lockForUpdate()->find($research->revision_parent_id);

        if (! $parent || $parent->status !== Statuses::RESEARCH_PUBLISHED) {
            throw new ResearchModerationTransitionException(
                'A newer revision has already been published. Refresh the record before trying again.',
                $research->status,
                true,
            );
        }

        $research->setRelation('lockedPublishParent', $parent);
    }

    private function supersedePublishParent(
        Request $request,
        Research $research,
        string $transitionId,
        string $action,
    ): void {
        if (! $research->relationLoaded('lockedPublishParent')) {
            return;
        }

        /** @var Research $parent */
        $parent = $research->getRelation('lockedPublishParent');
        $oldValues = $parent->only(['status', 'superseded_by_id']);

        $parent->update([
            'status' => Statuses::RESEARCH_SUPERSEDED,
            'superseded_by_id' => $research->id,
        ]);

        $this->auditWriter->record(
            $request,
            $transitionId,
            'research.superseded',
            $parent,
            $oldValues,
            $parent->fresh()->only(['status', 'superseded_by_id']),
            [
                'moderation_action' => $action,
                'published_revision_id' => $research->id,
            ],
        );
    }

    /** @return array{research: Research, decision: null} */
    private function archive(Request $request, Research $research, string $transitionId): array
    {
        $oldValues = $research->only(['status', 'archived_at', 'archived_by', 'archive_reason']);

        ArchiveRecord::create([
            'archivable_type' => $research->getMorphClass(),
            'archivable_id' => $research->id,
            'archived_by' => $request->user()->id,
            'reason' => $request->input('reason'),
            'metadata' => ['previous_status' => $research->status],
            'archived_at' => now(),
        ]);

        $research->update([
            'status' => Statuses::RESEARCH_ARCHIVED,
            'archived_at' => now(),
            'archived_by' => $request->user()->id,
            'archive_reason' => $request->input('reason'),
        ]);

        $this->auditWriter->record(
            $request,
            $transitionId,
            'research.archived',
            $research,
            $oldValues,
            $research->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason']),
            [
                'moderation_action' => self::ARCHIVE,
                'reason' => $request->input('reason'),
            ],
        );

        return ['research' => $research, 'decision' => null];
    }

    /** @return array{research: Research, decision: null} */
    private function restore(Request $request, Research $research, string $transitionId): array
    {
        $archiveRecord = ArchiveRecord::query()
            ->where('archivable_type', $research->getMorphClass())
            ->where('archivable_id', $research->id)
            ->whereNull('restored_at')
            ->latest('archived_at')
            ->lockForUpdate()
            ->first();
        $previousStatus = $archiveRecord?->metadata['previous_status'] ?? Statuses::RESEARCH_PUBLISHED;
        $oldValues = $research->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']);

        $research->update([
            'status' => $previousStatus,
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
            'restored_at' => now(),
            'restored_by' => $request->user()->id,
        ]);

        $archiveRecord?->update([
            'restored_by' => $request->user()->id,
            'restored_at' => now(),
        ]);

        $this->auditWriter->record(
            $request,
            $transitionId,
            'research.restored',
            $research,
            $oldValues,
            $research->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']),
            [
                'moderation_action' => self::RESTORE,
                'notes' => $request->input('notes'),
            ],
        );

        return ['research' => $research, 'decision' => null];
    }

    private function createNotification(
        Request $request,
        Research $research,
        string $transitionId,
        string $action,
        ?ResearchApproval $decision,
    ): void {
        if ($action === self::REJECT && $decision) {
            $instructions = trim((string) $decision->remarks);

            Notification::create([
                'transition_id' => $transitionId,
                'agency_id' => $research->agency_id,
                'type' => 'research.revision_requested',
                'title' => 'Revision Requested',
                'message' => $instructions,
                'data' => [
                    'research_id' => $research->id,
                    'research_title' => $research->title,
                    'status' => $research->status,
                    'concern_type' => $decision->issue_type,
                    'issue_type' => $decision->issue_type,
                    'instructions' => $instructions,
                    'moderation_date' => $decision->reviewed_at?->toISOString(),
                    'severity' => 'blocking',
                    'moderator_id' => $request->user()->id,
                    'moderator_name' => $request->user()->name,
                    'transition_id' => $transitionId,
                ],
                'action_url' => '/agency/research/'.$research->id,
                'priority' => 'high',
                'status' => Statuses::NOTIFICATION_UNREAD,
            ]);

            return;
        }

        $notification = match ($action) {
            self::APPROVE_AND_PUBLISH => ['research.approved_published', 'Research Approved and Published', 'A research record was approved and published in one moderation action.'],
            self::ARCHIVE => ['research.archived', 'Research Archived', 'A research record from your agency was archived.'],
            self::RESTORE => ['research.restored', 'Research Restored', 'A research record from your agency was restored.'],
            self::APPROVE => ['research.approved', 'Research Approved', 'A research moderation action was completed.'],
            self::PUBLISH => ['research.published', 'Research Published', 'A research moderation action was completed.'],
            self::RETURN_TO_DRAFT => ['research.returned', 'Research Returned', 'A research moderation action was completed.'],
            default => null,
        };

        if ($notification === null) {
            return;
        }

        [$type, $title, $message] = $notification;

        Notification::create([
            'transition_id' => $transitionId,
            'agency_id' => $research->agency_id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => [
                'research_id' => $research->id,
                'status' => $research->status,
                'transition_id' => $transitionId,
            ],
            'priority' => 'normal',
            'status' => Statuses::NOTIFICATION_UNREAD,
        ]);
    }
}
