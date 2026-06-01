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
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminResearchModerationController extends Controller
{
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
            );
        });

        return ApiResponse::success(
            'Research archived.',
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
        );
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
            $research->update(array_merge(['status' => $status], $extraValues));

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
}
