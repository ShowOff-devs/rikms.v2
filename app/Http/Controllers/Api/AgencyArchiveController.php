<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\ResearchResource;
use App\Models\ArchiveRecord;
use App\Models\Research;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AgencyArchiveController extends Controller
{
    use RespondsWithApiPagination;

    public function research(Request $request): JsonResponse
    {
        $query = Research::query()
            ->with(['agency', 'uploader', 'archivedBy'])
            ->where('agency_id', $request->user()->agency_id)
            ->whereNotNull('archived_at')
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('title', 'like', $keyword)
                        ->orWhere('abstract', 'like', $keyword)
                        ->orWhere('archive_reason', 'like', $keyword);
                });
            })
            ->orderBy('archived_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Agency archived research retrieved.',
            $query->paginate($this->perPage($request)),
            ResearchResource::class,
            $request,
        );
    }

    public function archiveResearch(Request $request, Research $research): JsonResponse
    {
        if (! $this->canManage($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        if ($research->status === Statuses::RESEARCH_PUBLISHED) {
            return ApiResponse::error('Published research must be archived by a super admin.', [], 422);
        }

        if ($research->archived_at) {
            return ApiResponse::error('This research record is already archived.', [], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $reason = $validated['reason'] ?? 'Archived by agency administrator.';
        $oldValues = $research->only(['status', 'archived_at', 'archived_by', 'archive_reason']);

        DB::transaction(function () use ($request, $research, $reason, $oldValues): void {
            ArchiveRecord::create([
                'archivable_type' => $research->getMorphClass(),
                'archivable_id' => $research->id,
                'archived_by' => $request->user()->id,
                'reason' => $reason,
                'metadata' => [
                    'previous_status' => $research->status,
                    'scope' => 'agency',
                ],
                'archived_at' => now(),
            ]);

            $research->update([
                'status' => Statuses::RESEARCH_ARCHIVED,
                'archived_at' => now(),
                'archived_by' => $request->user()->id,
                'archive_reason' => $reason,
            ]);

            AuditLogger::record(
                $request,
                'agency.research.archived',
                $research,
                $oldValues,
                $research->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason']),
            );
        });

        return ApiResponse::success(
            'Agency research archived.',
            (new ResearchResource($research->refresh()->load(['agency', 'uploader', 'archivedBy'])))->resolve($request),
        );
    }

    public function restoreResearch(Request $request, Research $research): JsonResponse
    {
        if (! $this->canManage($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        if (! $research->archived_at) {
            return ApiResponse::error('This research record is not archived.', [], 422);
        }

        $archiveRecord = ArchiveRecord::query()
            ->where('archivable_type', $research->getMorphClass())
            ->where('archivable_id', $research->id)
            ->whereNull('restored_at')
            ->latest('archived_at')
            ->first();

        $previousStatus = $archiveRecord?->metadata['previous_status'] ?? Statuses::RESEARCH_DRAFT;
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

            AuditLogger::record(
                $request,
                'agency.research.restored',
                $research,
                $oldValues,
                $research->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']),
            );
        });

        return ApiResponse::success(
            'Agency research restored.',
            (new ResearchResource($research->refresh()->load(['agency', 'uploader', 'restoredBy'])))->resolve($request),
        );
    }

    private function canManage(Request $request, Research $research): bool
    {
        return (int) $research->agency_id === (int) $request->user()->agency_id;
    }
}
