<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveResearchRequest;
use App\Http\Requests\Admin\ArchiveResearchRequest;
use App\Http\Requests\Admin\PublishResearchRequest;
use App\Http\Requests\Admin\RejectResearchRequest;
use App\Http\Requests\Admin\RestoreResearchRequest;
use App\Http\Requests\Admin\ReturnResearchRequest;
use App\Http\Resources\ResearchResource;
use App\Models\ArchiveRecord;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\ResearchSlugger;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminResearchModerationController extends Controller
{
    private const MODERATION_AUDIT_EVENTS = [
        'research.approved',
        'research.approved_published',
        'research.rejected',
        'research.published',
        'research.returned',
        'research.archived',
        'research.restored',
        'research.superseded',
        'research.duplicate.dismissed',
    ];

    public function approve(ApproveResearchRequest $request, Research $research): JsonResponse
    {
        if (! in_array($research->status, [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW], true)) {
            return ApiResponse::error('Only submitted or under-review research can be approved.', [], 422);
        }

        return $this->moderate($request, $research, 'approved', 'research.approved', [
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ], 'Research approved.');
    }

    public function reject(RejectResearchRequest $request, Research $research): JsonResponse
    {
        if (! in_array($research->status, [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW], true)) {
            return ApiResponse::error('Only submitted or under-review research can be rejected.', [], 422);
        }

        return $this->moderate($request, $research, 'rejected', 'research.rejected', [], 'Research rejected.');
    }

    public function approveAndPublish(ApproveResearchRequest $request, Research $research): JsonResponse
    {
        if (! in_array($research->status, [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW], true)) {
            return ApiResponse::error('Only submitted or under-review research can be approved and published.', [], 422);
        }

        DB::transaction(function () use ($request, $research): void {
            $lockedResearch = Research::query()->lockForUpdate()->findOrFail($research->id);

            if (! in_array($lockedResearch->status, [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW], true)) {
                abort(422, 'This action is not allowed for the current research status.');
            }

            $oldValues = $lockedResearch->only(['status', 'approved_at', 'approved_by', 'published_at', 'slug']);
            $nextValues = [
                'status' => Statuses::RESEARCH_PUBLISHED,
                'approved_at' => now(),
                'approved_by' => $request->user()->id,
                'published_at' => now(),
            ];

            if (! $lockedResearch->slug && $lockedResearch->title) {
                $nextValues['slug'] = ResearchSlugger::generateUniqueResearchSlug(
                    $lockedResearch->title,
                    (int) $lockedResearch->id,
                );
            }

            $lockedResearch->update($nextValues);

            if ($lockedResearch->revision_parent_id) {
                $parent = $lockedResearch->revisionParent()->lockForUpdate()->first();

                if ($parent && $parent->status === Statuses::RESEARCH_PUBLISHED) {
                    $parentOldValues = $parent->only(['status', 'superseded_by_id']);
                    $parent->update([
                        'status' => Statuses::RESEARCH_SUPERSEDED,
                        'superseded_by_id' => $lockedResearch->id,
                    ]);
                    AuditLogger::record(
                        $request,
                        'research.superseded',
                        $parent,
                        $parentOldValues,
                        $parent->fresh()->only(['status', 'superseded_by_id']),
                        ['published_revision_id' => $lockedResearch->id],
                    );
                }
            }

            ResearchApproval::create([
                'research_id' => $lockedResearch->id,
                'reviewed_by' => $request->user()->id,
                'status' => 'approved',
                'remarks' => $request->validated('notes'),
                'reviewed_at' => now(),
            ]);

            $this->notifyAgency(
                $lockedResearch,
                'research.approved_published',
                'Research Approved and Published',
                'A research record was approved and published in one moderation action.',
            );

            AuditLogger::record(
                $request,
                'research.approved_published',
                $lockedResearch,
                $oldValues,
                $lockedResearch->fresh()->only(['status', 'approved_at', 'approved_by', 'published_at', 'slug']),
                ['notes' => $request->validated('notes')],
            );
        });

        return ApiResponse::success(
            'Research approved and published.',
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
        );
    }

    public function publish(PublishResearchRequest $request, Research $research): JsonResponse
    {
        if ($research->status !== 'approved') {
            return ApiResponse::error('Only approved research can be published.', [], 422);
        }

        return $this->moderate($request, $research, Statuses::RESEARCH_PUBLISHED, 'research.published', [
            'published_at' => now(),
        ], 'Research published.');
    }

    public function return(ReturnResearchRequest $request, Research $research): JsonResponse
    {
        if (! in_array($research->status, ['rejected', Statuses::RESEARCH_UNDER_REVIEW], true)) {
            return ApiResponse::error('Only rejected or under-review research can be returned to draft.', [], 422);
        }

        return $this->moderate($request, $research, Statuses::RESEARCH_DRAFT, 'research.returned', [], 'Research returned to draft.');
    }

    public function archive(ArchiveResearchRequest $request, Research $research): JsonResponse
    {
        if (! in_array($research->status, [Statuses::RESEARCH_PUBLISHED, 'approved', 'rejected'], true)) {
            return ApiResponse::error('Only published, approved, or rejected research can be archived.', [], 422);
        }

        $oldValues = $research->only(['status', 'archived_at', 'archived_by', 'archive_reason']);

        DB::transaction(function () use ($request, $research, $oldValues): void {
            ArchiveRecord::create([
                'archivable_type' => $research->getMorphClass(),
                'archivable_id' => $research->id,
                'archived_by' => $request->user()->id,
                'reason' => $request->validated('reason'),
                'metadata' => [
                    'previous_status' => $research->status,
                ],
                'archived_at' => now(),
            ]);

            $research->update([
                'status' => 'archived',
                'archived_at' => now(),
                'archived_by' => $request->user()->id,
                'archive_reason' => $request->validated('reason'),
            ]);

            $this->notifyAgency($research, 'research.archived', 'Research Archived', 'A research record from your agency was archived.');

            AuditLogger::record(
                $request,
                'research.archived',
                $research,
                $oldValues,
                $research->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason']),
                ['reason' => $request->validated('reason')],
            );
        });

        return ApiResponse::success(
            'Research archived.',
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
        );
    }

    public function duplicates(Request $request): JsonResponse
    {
        $records = Research::query()
            ->with(['agency'])
            ->whereIn('status', [
                Statuses::RESEARCH_SUBMITTED,
                Statuses::RESEARCH_UNDER_REVIEW,
                'approved',
                'rejected',
                Statuses::RESEARCH_PUBLISHED,
            ])
            ->latest('created_at')
            ->limit(200)
            ->get();

        $dismissedPairKeys = AuditLog::query()
            ->where('event', 'research.duplicate.dismissed')
            ->get()
            ->map(fn (AuditLog $log): ?string => $log->metadata['pair_key'] ?? null)
            ->filter()
            ->values()
            ->all();

        $matches = $this->detectDuplicateMatches($records, $dismissedPairKeys);

        return ApiResponse::success('Duplicate research matches retrieved.', array_slice($matches, 0, 20));
    }

    public function dismissDuplicate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'original_research_id' => ['required', 'integer', 'exists:research,id'],
            'matching_research_id' => ['required', 'integer', 'different:original_research_id', 'exists:research,id'],
        ]);

        $matchingResearch = Research::query()->findOrFail($validated['matching_research_id']);
        $pairKey = $this->duplicatePairKey((int) $validated['original_research_id'], (int) $validated['matching_research_id']);

        AuditLogger::record(
            $request,
            'research.duplicate.dismissed',
            $matchingResearch,
            null,
            null,
            [
                'pair_key' => $pairKey,
                'original_research_id' => (int) $validated['original_research_id'],
                'matching_research_id' => (int) $validated['matching_research_id'],
            ],
        );

        return ApiResponse::success('Duplicate match dismissed.', [
            'pair_key' => $pairKey,
        ]);
    }

    public function activity(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with(['user', 'auditable'])
            ->whereIn('event', self::MODERATION_AUDIT_EVENTS)
            ->latest('created_at')
            ->limit(50)
            ->get()
            ->map(fn (AuditLog $log): array => $this->moderationActivityPayload($log))
            ->values();

        return ApiResponse::success('Moderation activity retrieved.', $logs);
    }

    public function restore(RestoreResearchRequest $request, Research $research): JsonResponse
    {
        $archiveRecord = ArchiveRecord::query()
            ->where('archivable_type', $research->getMorphClass())
            ->where('archivable_id', $research->id)
            ->whereNull('restored_at')
            ->latest('archived_at')
            ->first();

        $previousStatus = $archiveRecord?->metadata['previous_status'] ?? Statuses::RESEARCH_PUBLISHED;
        $oldValues = $research->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']);

        DB::transaction(function () use ($request, $research, $archiveRecord, $previousStatus, $oldValues): void {
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

            $this->notifyAgency($research, 'research.restored', 'Research Restored', 'A research record from your agency was restored.');

            AuditLogger::record(
                $request,
                'research.restored',
                $research,
                $oldValues,
                $research->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']),
                ['notes' => $request->validated('notes')],
            );
        });

        return ApiResponse::success(
            'Research restored.',
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
        );
    }

    /**
     * @param  array<string, mixed>  $extraValues
     */
    private function moderate(Request $request, Research $research, string $status, string $event, array $extraValues, string $message): JsonResponse
    {
        $oldValues = $research->only(['status', 'approved_at', 'approved_by', 'published_at']);

        DB::transaction(function () use ($request, $research, $status, $event, $extraValues, $oldValues): void {
            $nextValues = array_merge(['status' => $status], $extraValues);

            if ($status === Statuses::RESEARCH_PUBLISHED && ! $research->slug && $research->title) {
                $nextValues['slug'] = ResearchSlugger::generateUniqueResearchSlug($research->title, (int) $research->id);
            }

            $research->update($nextValues);

            if ($status === Statuses::RESEARCH_PUBLISHED && $research->revision_parent_id) {
                $parent = $research->revisionParent()->lockForUpdate()->first();

                if ($parent && $parent->status === Statuses::RESEARCH_PUBLISHED) {
                    $parentOldValues = $parent->only(['status', 'superseded_by_id']);

                    $parent->update([
                        'status' => Statuses::RESEARCH_SUPERSEDED,
                        'superseded_by_id' => $research->id,
                    ]);

                    AuditLogger::record(
                        $request,
                        'research.superseded',
                        $parent,
                        $parentOldValues,
                        $parent->fresh()->only(['status', 'superseded_by_id']),
                        ['published_revision_id' => $research->id],
                    );
                }
            }

            ResearchApproval::create([
                'research_id' => $research->id,
                'reviewed_by' => $request->user()->id,
                'status' => $status === Statuses::RESEARCH_PUBLISHED ? 'approved' : $status,
                'remarks' => $request->input('notes'),
                'reviewed_at' => now(),
            ]);

            $this->notifyAgency(
                $research,
                $event,
                str($event)->after('research.')->replace('_', ' ')->title()->prepend('Research ')->toString(),
                'A research moderation action was completed.',
            );

            AuditLogger::record(
                $request,
                $event,
                $research,
                $oldValues,
                $research->fresh()->only(['status', 'approved_at', 'approved_by', 'published_at']),
                ['notes' => $request->input('notes')],
            );
        });

        return ApiResponse::success(
            $message,
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
        );
    }

    private function notifyAgency(Research $research, string $type, string $title, string $message): void
    {
        Notification::create([
            'agency_id' => $research->agency_id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => [
                'research_id' => $research->id,
                'status' => $research->status,
            ],
            'priority' => 'normal',
            'status' => Statuses::NOTIFICATION_UNREAD,
        ]);
    }

    /**
     * @param  EloquentCollection<int, Research>  $records
     * @param  array<int, string>  $dismissedPairKeys
     * @return array<int, array<string, mixed>>
     */
    private function detectDuplicateMatches(EloquentCollection $records, array $dismissedPairKeys): array
    {
        $matches = [];
        $dismissed = array_flip($dismissedPairKeys);

        for ($leftIndex = 0; $leftIndex < $records->count(); $leftIndex++) {
            for ($rightIndex = $leftIndex + 1; $rightIndex < $records->count(); $rightIndex++) {
                $left = $records[$leftIndex];
                $right = $records[$rightIndex];

                if ($this->isRevisionPair($left, $right)) {
                    continue;
                }

                $score = $this->duplicateScore($left, $right);

                if ($score < 85) {
                    continue;
                }

                [$original, $matching] = $this->orderedDuplicatePair($left, $right);
                $pairKey = $this->duplicatePairKey((int) $original->id, (int) $matching->id);

                if (isset($dismissed[$pairKey])) {
                    continue;
                }

                $matches[] = [
                    'id' => $pairKey,
                    'original_research_id' => $original->id,
                    'matching_research_id' => $matching->id,
                    'originalTitle' => $original->title,
                    'matchingTitle' => $matching->title,
                    'originalAgency' => $original->agency?->short_name ?? $original->agency?->name ?? 'Agency',
                    'matchingAgency' => $matching->agency?->short_name ?? $matching->agency?->name ?? 'Agency',
                    'similarityScore' => $score,
                    'detectedAt' => ($matching->created_at ?? now())->toISOString(),
                    'originalAuthors' => $original->authors ?? [],
                    'matchingAuthors' => $matching->authors ?? [],
                    'originalYear' => $original->publication_year,
                    'matchingYear' => $matching->publication_year,
                    'matchReason' => $this->duplicateMatchReason($left, $right, $score),
                    'originalAbstract' => $original->abstract,
                    'matchingAbstract' => $matching->abstract,
                ];
            }
        }

        usort($matches, fn (array $left, array $right): int => $right['similarityScore'] <=> $left['similarityScore']);

        return $matches;
    }

    private function duplicateScore(Research $left, Research $right): int
    {
        $leftTitle = $this->normalizedText((string) $left->title);
        $rightTitle = $this->normalizedText((string) $right->title);

        if ($leftTitle === '' || $rightTitle === '') {
            return 0;
        }

        similar_text($leftTitle, $rightTitle, $titleSimilarity);

        $score = (int) round($titleSimilarity * 0.9);

        if ($left->publication_year && $left->publication_year === $right->publication_year) {
            $score += 5;
        }

        if ($this->hasAuthorOverlap($left->authors ?? [], $right->authors ?? [])) {
            $score += 5;
        }

        return min(100, $score);
    }

    /**
     * @param  array<int, string>  $leftAuthors
     * @param  array<int, string>  $rightAuthors
     */
    private function hasAuthorOverlap(array $leftAuthors, array $rightAuthors): bool
    {
        $left = collect($leftAuthors)
            ->map(fn (string $author): string => $this->normalizedText($author))
            ->filter();
        $right = collect($rightAuthors)
            ->map(fn (string $author): string => $this->normalizedText($author))
            ->filter();

        return $left->intersect($right)->isNotEmpty();
    }

    private function normalizedText(string $value): string
    {
        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', strtolower($value)));
    }

    private function isRevisionPair(Research $left, Research $right): bool
    {
        return (int) $left->revision_parent_id === (int) $right->id
            || (int) $right->revision_parent_id === (int) $left->id
            || ($left->revision_parent_id !== null && (int) $left->revision_parent_id === (int) $right->revision_parent_id);
    }

    /**
     * @return array{0: Research, 1: Research}
     */
    private function orderedDuplicatePair(Research $left, Research $right): array
    {
        if ($left->status === Statuses::RESEARCH_PUBLISHED && $right->status !== Statuses::RESEARCH_PUBLISHED) {
            return [$left, $right];
        }

        if ($right->status === Statuses::RESEARCH_PUBLISHED && $left->status !== Statuses::RESEARCH_PUBLISHED) {
            return [$right, $left];
        }

        return $left->created_at <= $right->created_at ? [$left, $right] : [$right, $left];
    }

    private function duplicatePairKey(int $leftId, int $rightId): string
    {
        return collect([$leftId, $rightId])->sort()->implode(':');
    }

    private function duplicateMatchReason(Research $left, Research $right, int $score): string
    {
        if ($this->normalizedText((string) $left->title) === $this->normalizedText((string) $right->title)) {
            return 'Exact title match with overlapping moderation metadata.';
        }

        return "Similar title and metadata match ({$score}% confidence).";
    }

    /**
     * @return array<string, mixed>
     */
    private function moderationActivityPayload(AuditLog $log): array
    {
        $research = $log->auditable instanceof Research ? $log->auditable : null;

        return [
            'id' => (string) $log->id,
            'actor' => $log->user?->name ?? 'System',
            'action' => $this->moderationActivityAction($log->event),
            'researchTitle' => $research?->title ?? 'Research record',
            'timestamp' => ($log->created_at ?? now())->toISOString(),
            'type' => $this->moderationActivityType($log->event),
        ];
    }

    private function moderationActivityAction(string $event): string
    {
        return match ($event) {
            'research.approved' => 'Approved research:',
            'research.approved_published' => 'Approved and published research:',
            'research.rejected' => 'Flagged for revision:',
            'research.published' => 'Published research:',
            'research.returned' => 'Returned research to draft:',
            'research.archived' => 'Archived research:',
            'research.restored' => 'Restored research:',
            'research.superseded' => 'Superseded previous version:',
            'research.duplicate.dismissed' => 'Marked not duplicate:',
            default => 'Updated moderation status:',
        };
    }

    private function moderationActivityType(string $event): string
    {
        return match ($event) {
            'research.approved' => 'approved',
            'research.approved_published' => 'version-approved',
            'research.rejected', 'research.returned' => 'revision-requested',
            'research.published', 'research.superseded' => 'version-approved',
            'research.archived' => 'archived',
            'research.duplicate.dismissed' => 'duplicate-resolved',
            default => 'issue-resolved',
        };
    }
}
