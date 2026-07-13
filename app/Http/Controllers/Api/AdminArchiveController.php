<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\ResearchFileResource;
use App\Http\Resources\ResearchResource;
use App\Models\Agency;
use App\Models\ArchiveRecord;
use App\Models\AuditLog;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\CsvExport;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function agencies(Request $request): JsonResponse
    {
        $query = Agency::query()
            ->with('archivedBy')
            ->whereNotNull('archived_at')
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('short_name', 'like', $keyword)
                        ->orWhere('type', 'like', $keyword)
                        ->orWhere('archive_reason', 'like', $keyword);
                });
            })
            ->orderBy('archived_at', $this->sortDirection($request));

        $paginator = $query->paginate($this->perPage($request));

        return $this->archivePaginatedResponse(
            'Admin archived agencies retrieved.',
            $paginator,
            $paginator->getCollection()->map(fn (Agency $agency): array => $this->agencyPayload($agency))->values()->all(),
        );
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::withTrashed()
            ->with(['agency', 'roles', 'archivedBy'])
            ->whereNotNull('archived_at')
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('email', 'like', $keyword)
                        ->orWhere('role', 'like', $keyword)
                        ->orWhere('archive_reason', 'like', $keyword)
                        ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                });
            })
            ->orderBy('archived_at', $this->sortDirection($request));

        $paginator = $query->paginate($this->perPage($request));

        return $this->archivePaginatedResponse(
            'Admin archived users retrieved.',
            $paginator,
            $paginator->getCollection()->map(fn (User $user): array => $this->userPayload($user))->values()->all(),
        );
    }

    public function activity(): JsonResponse
    {
        $activities = AuditLog::query()
            ->with(['user:id,name,email', 'agency:id,name,short_name'])
            ->where(function (Builder $query): void {
                $query->where('event', 'like', '%archived%')
                    ->orWhere('event', 'like', '%restored%')
                    ->orWhere('event', 'like', '%deleted%')
                    ->orWhere('event', 'like', '%removed%');
            })
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->map(fn (AuditLog $log): array => $this->activityPayload($log))
            ->values();

        return ApiResponse::success('Admin archive activity retrieved.', $activities);
    }

    public function export(Request $request): StreamedResponse
    {
        $fileName = 'admin-archive-report-'.now()->format('Ymd-His').'.csv';
        $rows = $this->exportRows($request);

        return response()->streamDownload(function () use ($rows): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Type', 'Title', 'Agency', 'Archived By', 'Archive Date', 'Status']);

            foreach ($rows as $row) {
                fputcsv($handle, CsvExport::row($row));
            }

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
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

    public function restoreAgency(Request $request, Agency $agency): JsonResponse
    {
        if (! $agency->archived_at && ! $agency->trashed()) {
            return ApiResponse::error('This agency is not archived.', [], 422);
        }

        $oldValues = $agency->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by', 'deleted_at']);

        DB::transaction(function () use ($request, $agency, $oldValues): void {
            if ($agency->trashed()) {
                $agency->restore();
            }

            $agency->forceFill([
                'status' => 'active',
                'archived_at' => null,
                'archived_by' => null,
                'archive_reason' => null,
                'restored_at' => now(),
                'restored_by' => $request->user()->id,
            ])->save();

            AuditLogger::record(
                $request,
                'admin.agency.restored',
                $agency,
                $oldValues,
                $agency->fresh()->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by', 'deleted_at']),
            );
        });

        return ApiResponse::success('Agency restored.', $this->agencyPayload($agency->refresh()->load('archivedBy')));
    }

    public function restoreUser(Request $request, User $user): JsonResponse
    {
        if (! $user->archived_at && ! $user->trashed()) {
            return ApiResponse::error('This user is not archived.', [], 422);
        }

        $oldValues = $user->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by', 'deleted_at']);
        $previousValues = $this->latestArchiveOldValues($user);
        $role = $this->agencyAdminRole();
        $agencyId = $this->restorableAgencyId($previousValues['agency_id'] ?? $user->agency_id);

        DB::transaction(function () use ($request, $user, $oldValues, $role, $agencyId): void {
            if ($user->trashed()) {
                $user->restore();
            }

            $user->forceFill([
                'agency_id' => $agencyId,
                'role' => 'agency_admin',
                'status' => 'active',
                'archived_at' => null,
                'archived_by' => null,
                'archive_reason' => null,
                'restored_at' => now(),
                'restored_by' => $request->user()->id,
            ])->save();

            $user->roles()->syncWithoutDetaching([
                $role->id => [
                    'assigned_by' => $request->user()->id,
                    'assigned_at' => now(),
                ],
            ]);

            AuditLogger::record(
                $request,
                'admin.user.restored',
                $user,
                $oldValues,
                $user->fresh()->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by', 'deleted_at']),
            );
        });

        return ApiResponse::success('User restored.', $this->userPayload($user->refresh()->load(['agency', 'roles', 'archivedBy'])));
    }

    public function destroyResearch(Request $request, Research $research): JsonResponse
    {
        if (! $research->archived_at) {
            return ApiResponse::error('Only archived research records can be deleted from the archive.', [], 422);
        }

        $oldValues = $research->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']);
        $responseData = (new ResearchResource($research->load(['agency', 'uploader', 'archivedBy'])))->resolve($request);

        DB::transaction(function () use ($request, $research, $oldValues): void {
            $research->delete();

            AuditLogger::record(
                $request,
                'admin.research.deleted',
                $research,
                $oldValues,
                $research->fresh()?->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']) ?? ['deleted_at' => now()->toISOString()],
            );
        });

        return ApiResponse::success('Archived research deleted.', $responseData);
    }

    public function destroyFile(Request $request, ResearchFile $file): JsonResponse
    {
        if (! $file->archived_at && ! $file->trashed()) {
            return ApiResponse::error('Only archived research files can be deleted from the archive.', [], 422);
        }

        $oldValues = $file->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']);
        $responseData = (new ResearchFileResource($file->load(['research.agency', 'uploader', 'archivedBy'])))->resolve($request);

        DB::transaction(function () use ($request, $file, $oldValues): void {
            if (! $file->trashed()) {
                $file->delete();
            }

            AuditLogger::record(
                $request,
                'admin.file.deleted',
                $file,
                $oldValues,
                $file->fresh()?->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']) ?? ['deleted_at' => now()->toISOString()],
            );
        });

        return ApiResponse::success('Archived research file deleted.', $responseData);
    }

    public function destroyAgency(Request $request, Agency $agency): JsonResponse
    {
        if (! $agency->archived_at && ! $agency->trashed()) {
            return ApiResponse::error('Only archived agencies can be deleted from the archive.', [], 422);
        }

        $oldValues = $agency->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']);
        $responseData = $this->agencyPayload($agency->load('archivedBy'));

        DB::transaction(function () use ($request, $agency, $oldValues): void {
            if (! $agency->trashed()) {
                $agency->delete();
            }

            AuditLogger::record(
                $request,
                'admin.agency.deleted',
                $agency,
                $oldValues,
                $agency->fresh()?->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']) ?? ['deleted_at' => now()->toISOString()],
            );
        });

        return ApiResponse::success('Archived agency deleted.', $responseData);
    }

    public function destroyUser(Request $request, User $user): JsonResponse
    {
        if (! $user->archived_at && ! $user->trashed()) {
            return ApiResponse::error('Only archived users can be deleted from the archive.', [], 422);
        }

        $oldValues = $user->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']);
        $responseData = $this->userPayload($user->load(['agency', 'roles', 'archivedBy']));

        DB::transaction(function () use ($request, $user, $oldValues): void {
            if (! $user->trashed()) {
                $user->delete();
            }

            AuditLogger::record(
                $request,
                'admin.user.deleted',
                $user,
                $oldValues,
                $user->fresh()?->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']) ?? ['deleted_at' => now()->toISOString()],
            );
        });

        return ApiResponse::success('Archived user deleted.', $responseData);
    }

    /**
     * @return array<string, mixed>
     */
    private function archivePaginatedResponse(string $message, LengthAwarePaginator $paginator, array $data): JsonResponse
    {
        return ApiResponse::success(
            $message,
            $data,
            [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function agencyPayload(Agency $agency): array
    {
        return [
            'id' => $agency->id,
            'name' => $agency->name,
            'short_name' => $agency->short_name,
            'type' => $agency->type,
            'status' => $agency->status,
            'archived_at' => $agency->archived_at?->toISOString(),
            'archived_by' => $agency->archived_by,
            'archived_by_user' => $agency->relationLoaded('archivedBy') && $agency->archivedBy ? [
                'name' => $agency->archivedBy->name,
                'email' => $agency->archivedBy->email,
            ] : null,
            'archive_reason' => $agency->archive_reason,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'roles' => $user->relationLoaded('roles')
                ? $user->roles->pluck('slug')->values()->all()
                : [],
            'status' => $user->status,
            'agency' => $user->relationLoaded('agency') && $user->agency ? [
                'name' => $user->agency->name,
                'short_name' => $user->agency->short_name,
            ] : null,
            'archived_at' => $user->archived_at?->toISOString(),
            'archived_by' => $user->archived_by,
            'archived_by_user' => $user->relationLoaded('archivedBy') && $user->archivedBy ? [
                'name' => $user->archivedBy->name,
                'email' => $user->archivedBy->email,
            ] : null,
            'archive_reason' => $user->archive_reason,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function activityPayload(AuditLog $log): array
    {
        $recordType = $this->activityRecordType($log);

        return [
            'id' => (string) $log->id,
            'type' => $this->activityType($log, $recordType),
            'title' => $this->activityTitle($log, $recordType),
            'recordType' => $recordType,
            'performedBy' => $log->user?->name ?? 'System',
            'agency' => $log->agency?->short_name ?: $log->agency?->name,
            'timestamp' => $log->created_at?->toISOString(),
        ];
    }

    private function activityRecordType(AuditLog $log): string
    {
        $type = (string) $log->auditable_type;

        if ($type === (new Agency)->getMorphClass()) {
            return 'agency';
        }

        if ($type === (new User)->getMorphClass()) {
            return 'user';
        }

        if ($type === (new ResearchFile)->getMorphClass()) {
            return 'file';
        }

        return 'research';
    }

    private function activityType(AuditLog $log, string $recordType): string
    {
        if (str_contains($log->event, 'restored')) {
            return 'record-restored';
        }

        if (str_contains($log->event, 'deleted') || str_contains($log->event, 'removed')) {
            return 'record-permanently-deleted';
        }

        return match ($recordType) {
            'agency' => 'agency-archived',
            'file' => 'file-archived',
            'user' => 'user-archived',
            default => 'research-archived',
        };
    }

    private function activityTitle(AuditLog $log, string $recordType): string
    {
        $values = array_merge((array) $log->old_values, (array) $log->new_values);

        return match ($recordType) {
            'agency' => (string) ($values['name'] ?? $values['short_name'] ?? 'Agency record'),
            'file' => (string) ($values['original_name'] ?? 'Research file'),
            'user' => (string) ($values['name'] ?? $values['email'] ?? 'User account'),
            default => (string) ($values['title'] ?? 'Research record'),
        };
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function exportRows(Request $request): array
    {
        $includeResearch = $request->boolean('include_research', true);
        $includeFiles = $request->boolean('include_files', true);
        $includeAgencies = $request->boolean('include_agencies', true);
        $includeUsers = $request->boolean('include_users', true);
        $rows = [];

        if ($includeResearch) {
            Research::query()
                ->with(['agency', 'archivedBy'])
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->get()
                ->each(function (Research $research) use (&$rows): void {
                    $rows[] = [
                        'Research',
                        $research->title,
                        $research->agency?->short_name ?: $research->agency?->name ?: '',
                        $research->archivedBy?->name ?: 'System',
                        $research->archived_at?->toISOString() ?? '',
                        $research->status,
                    ];
                });
        }

        if ($includeFiles) {
            ResearchFile::query()
                ->with(['research.agency', 'archivedBy'])
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->get()
                ->each(function (ResearchFile $file) use (&$rows): void {
                    $rows[] = [
                        'File',
                        $file->original_name,
                        $file->research?->agency?->short_name ?: $file->research?->agency?->name ?: '',
                        $file->archivedBy?->name ?: 'System',
                        $file->archived_at?->toISOString() ?? '',
                        $file->status,
                    ];
                });
        }

        if ($includeAgencies) {
            Agency::query()
                ->with('archivedBy')
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->get()
                ->each(function (Agency $agency) use (&$rows): void {
                    $rows[] = [
                        'Agency',
                        $agency->name,
                        $agency->short_name ?: '',
                        $agency->archivedBy?->name ?: 'System',
                        $agency->archived_at?->toISOString() ?? '',
                        $agency->status,
                    ];
                });
        }

        if ($includeUsers) {
            User::withTrashed()
                ->with(['agency', 'archivedBy'])
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->get()
                ->each(function (User $user) use (&$rows): void {
                    $rows[] = [
                        'User',
                        $user->name,
                        $user->agency?->short_name ?: $user->agency?->name ?: '',
                        $user->archivedBy?->name ?: 'System',
                        $user->archived_at?->toISOString() ?? '',
                        $user->status,
                    ];
                });
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    private function latestArchiveOldValues(User $user): array
    {
        $log = AuditLog::query()
            ->where('auditable_type', $user->getMorphClass())
            ->where('auditable_id', $user->id)
            ->whereIn('event', ['agency_admin_user.removed', 'admin.user.deleted'])
            ->latest('created_at')
            ->first();

        return (array) $log?->old_values;
    }

    private function restorableAgencyId(mixed $agencyId): ?int
    {
        if (! is_numeric($agencyId)) {
            return null;
        }

        $agency = Agency::query()
            ->whereKey((int) $agencyId)
            ->whereNull('archived_at')
            ->first();

        return $agency?->id;
    }

    private function agencyAdminRole(): Role
    {
        return Role::query()->firstOrCreate(
            ['slug' => 'agency_admin'],
            [
                'name' => 'Agency Admin',
                'display_name' => 'Agency Admin',
                'description' => 'Agency-level administrator for research uploads and access requests.',
                'is_system' => true,
                'is_active' => true,
            ],
        );
    }
}
