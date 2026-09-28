<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ResearchModerationTransitionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveResearchRequest;
use App\Http\Requests\Admin\ArchiveResearchRequest;
use App\Http\Requests\Admin\PublishResearchRequest;
use App\Http\Requests\Admin\RejectResearchRequest;
use App\Http\Requests\Admin\RestoreResearchRequest;
use App\Http\Requests\Admin\ReturnResearchRequest;
use App\Http\Resources\ResearchResource;
use App\Models\AuditLog;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Services\ResearchModerationTransitionService;
use App\Support\ApiResponse;
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
        'research.duplicate.flagged',
    ];

    public function __construct(private readonly ResearchModerationTransitionService $transitions) {}

    public function approve(ApproveResearchRequest $request, Research $research): JsonResponse
    {
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::APPROVE, 'Research approved.');
    }

    public function reject(RejectResearchRequest $request, Research $research): JsonResponse
    {
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::REJECT, 'Research revision requested.');
    }

    public function approveAndPublish(ApproveResearchRequest $request, Research $research): JsonResponse
    {
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::APPROVE_AND_PUBLISH, 'Research approved and published.');
    }

    public function publish(PublishResearchRequest $request, Research $research): JsonResponse
    {
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::PUBLISH, 'Research published.');
    }

    public function return(ReturnResearchRequest $request, Research $research): JsonResponse
    {
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::RETURN_TO_DRAFT, 'Research returned to draft.');
    }

    public function archive(ArchiveResearchRequest $request, Research $research): JsonResponse
    {
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::ARCHIVE, 'Research archived.');
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

        $handledPairKeys = AuditLog::query()
            ->whereIn('event', ['research.duplicate.dismissed', 'research.duplicate.flagged'])
            ->get()
            ->map(fn (AuditLog $log): ?string => $log->metadata['pair_key'] ?? null)
            ->filter()
            ->values()
            ->all();

        $matches = $this->detectDuplicateMatches($records, $handledPairKeys);

        return ApiResponse::success('Duplicate research matches retrieved.', array_slice($matches, 0, 20));
    }

    public function dismissDuplicate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'original_research_id' => ['required', 'integer', 'exists:research,id'],
            'matching_research_id' => ['required', 'integer', 'different:original_research_id', 'exists:research,id'],
        ]);

        $pairKey = DB::transaction(function () use ($request, $validated): string {
            $records = Research::query()
                ->whereIn('id', collect([$validated['original_research_id'], $validated['matching_research_id']])->sort()->values())
                ->whereIn('status', [
                    Statuses::RESEARCH_SUBMITTED,
                    Statuses::RESEARCH_UNDER_REVIEW,
                    'approved',
                    'rejected',
                    Statuses::RESEARCH_PUBLISHED,
                ])
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $originalResearch = $records->get($validated['original_research_id']);
            $matchingResearch = $records->get($validated['matching_research_id']);

            abort_unless($originalResearch && $matchingResearch, 422, 'Both research records must be eligible for duplicate review.');
            abort_if($this->isRevisionPair($originalResearch, $matchingResearch), 422, 'Revisions of the same research record cannot be dismissed as duplicates.');
            abort_if($this->duplicateScore($originalResearch, $matchingResearch) < 85, 422, 'These records do not meet the duplicate-alert threshold.');

            $pairKey = $this->duplicatePairKey((int) $validated['original_research_id'], (int) $validated['matching_research_id']);
            $alreadyHandled = AuditLog::query()
                ->whereIn('event', ['research.duplicate.dismissed', 'research.duplicate.flagged'])
                ->where('metadata->pair_key', $pairKey)
                ->exists();

            abort_if($alreadyHandled, 409, 'This duplicate match has already been reviewed.');

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'agency_id' => $request->user()?->agency_id,
                'event' => 'research.duplicate.dismissed',
                'auditable_type' => $matchingResearch->getMorphClass(),
                'auditable_id' => $matchingResearch->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => [
                    'pair_key' => $pairKey,
                    'original_research_id' => (int) $validated['original_research_id'],
                    'matching_research_id' => (int) $validated['matching_research_id'],
                ],
                'created_at' => now(),
            ]);

            return $pairKey;
        });

        return ApiResponse::success('Duplicate match dismissed.', [
            'pair_key' => $pairKey,
        ]);
    }

    public function flagDuplicate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'original_research_id' => ['required', 'integer', 'exists:research,id'],
            'matching_research_id' => ['required', 'integer', 'different:original_research_id', 'exists:research,id'],
            'notes' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($request, $validated): array {
            $records = Research::query()
                ->whereIn('id', collect([$validated['original_research_id'], $validated['matching_research_id']])->sort()->values())
                ->whereIn('status', [
                    Statuses::RESEARCH_SUBMITTED,
                    Statuses::RESEARCH_UNDER_REVIEW,
                    'approved',
                    'rejected',
                    Statuses::RESEARCH_PUBLISHED,
                ])
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $originalResearch = $records->get($validated['original_research_id']);
            $matchingResearch = $records->get($validated['matching_research_id']);

            abort_unless($originalResearch && $matchingResearch, 422, 'Both research records must be eligible for duplicate review.');
            abort_if($this->isRevisionPair($originalResearch, $matchingResearch), 422, 'Revisions of the same research record cannot be flagged as duplicates.');

            $score = $this->duplicateScore($originalResearch, $matchingResearch);
            abort_if($score < 85, 422, 'These records do not meet the duplicate-alert threshold.');

            $pairKey = $this->duplicatePairKey((int) $validated['original_research_id'], (int) $validated['matching_research_id']);
            $alreadyHandled = AuditLog::query()
                ->whereIn('event', ['research.duplicate.dismissed', 'research.duplicate.flagged'])
                ->where('metadata->pair_key', $pairKey)
                ->exists();

            abort_if($alreadyHandled, 409, 'This duplicate match has already been reviewed.');

            $decision = ResearchApproval::query()->create([
                'research_id' => $matchingResearch->id,
                'reviewed_by' => $request->user()->id,
                'status' => 'flagged',
                'issue_type' => 'possible_duplicate',
                'remarks' => sprintf(
                    'Potential duplicate of "%s" (%d%% similarity). Moderator rationale: %s',
                    $originalResearch->title,
                    $score,
                    $validated['notes'],
                ),
                'reviewed_at' => now(),
            ]);

            AuditLog::query()->create([
                'user_id' => $request->user()->id,
                'agency_id' => $request->user()->agency_id,
                'event' => 'research.duplicate.flagged',
                'auditable_type' => $matchingResearch->getMorphClass(),
                'auditable_id' => $matchingResearch->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => [
                    'pair_key' => $pairKey,
                    'original_research_id' => (int) $validated['original_research_id'],
                    'matching_research_id' => (int) $validated['matching_research_id'],
                    'similarity_score' => $score,
                    'decision_id' => $decision->id,
                    'issue_type' => 'possible_duplicate',
                    'notes' => $validated['notes'],
                ],
                'created_at' => now(),
            ]);

            return [
                'pair_key' => $pairKey,
                'matching_research_id' => $matchingResearch->id,
            ];
        });

        return ApiResponse::success('Duplicate match flagged for review.', $result);
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
        return $this->transitionResponse($request, $research, ResearchModerationTransitionService::RESTORE, 'Research restored.');
    }

    private function transitionResponse(Request $request, Research $research, string $action, string $message): JsonResponse
    {
        try {
            $updatedResearch = $this->transitions->transition($request, $research, $action);
        } catch (ResearchModerationTransitionException $exception) {
            return ApiResponse::error($exception->getMessage(), [
                'research' => [$exception->getMessage()],
                'code' => [$exception->stale ? 'RESEARCH_MODERATION_CONFLICT' : 'RESEARCH_MODERATION_TRANSITION_INVALID'],
                'current_status' => [$exception->currentStatus],
                'refresh_url' => ["/api/admin/research/{$research->id}"],
            ], $exception->statusCode());
        }

        return ApiResponse::success(
            $message,
            (new ResearchResource($updatedResearch->load(['agency', 'uploader', 'latestModerationDecision.reviewer'])))->resolve($request),
        );
    }

    /**
     * @param  EloquentCollection<int, Research>  $records
     * @param  array<int, string>  $handledPairKeys
     * @return array<int, array<string, mixed>>
     */
    private function detectDuplicateMatches(EloquentCollection $records, array $handledPairKeys): array
    {
        $matches = [];
        $handled = array_flip($handledPairKeys);

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

                if (isset($handled[$pairKey])) {
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
                    'originalStatus' => $original->status,
                    'matchingStatus' => $matching->status,
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
            'research.duplicate.flagged' => 'Flagged duplicate for review:',
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
            'research.duplicate.flagged' => 'revision-requested',
            default => 'issue-resolved',
        };
    }
}
