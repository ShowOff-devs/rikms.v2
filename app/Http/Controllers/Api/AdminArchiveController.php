<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\ResearchFileResource;
use App\Http\Resources\ResearchResource;
use App\Models\ArchiveRecord;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminArchiveController extends Controller
{
    use RespondsWithApiPagination;

    public function research(Request $request): JsonResponse
    {
        $query = Research::query()
            ->with(['agency', 'uploader', 'archivedBy'])
            ->whereNotNull('archived_at')
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('title', 'like', $keyword)
                        ->orWhere('abstract', 'like', $keyword)
                        ->orWhere('archive_reason', 'like', $keyword)
                        ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                });
            })
            ->orderBy('archived_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin archived research retrieved.',
            $query->paginate($this->perPage($request)),
            ResearchResource::class,
            $request,
        );
    }

    public function files(Request $request): JsonResponse
    {
        $query = ResearchFile::query()
            ->with(['research.agency', 'uploader', 'archivedBy'])
            ->whereNotNull('archived_at')
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('original_name', 'like', $keyword)
                        ->orWhere('archive_reason', 'like', $keyword)
                        ->orWhereHas('research', fn (Builder $query) => $query->where('title', 'like', $keyword));
                });
            })
            ->orderBy('archived_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin archived files retrieved.',
            $query->paginate($this->perPage($request)),
            ResearchFileResource::class,
            $request,
        );
    }

    public function restoreFile(Request $request, ResearchFile $file): JsonResponse
    {
        if (! $file->archived_at) {
            return ApiResponse::error('This research file is not archived.', [], 422);
        }

        $archiveRecord = ArchiveRecord::query()
            ->where('archivable_type', $file->getMorphClass())
            ->where('archivable_id', $file->id)
            ->whereNull('restored_at')
            ->latest('archived_at')
            ->first();
        $oldValues = $file->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']);

        DB::transaction(function () use ($request, $file, $archiveRecord, $oldValues): void {
            $file->update([
                'status' => 'active',
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
                'admin.file.restored',
                $file,
                $oldValues,
                $file->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']),
            );
        });

        return ApiResponse::success(
            'Research file restored.',
            (new ResearchFileResource($file->refresh()->load(['research.agency', 'uploader', 'restoredBy'])))->resolve($request),
        );
    }
}
