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
use App\Services\ResearchFileStorage;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\CsvExport;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminArchiveController extends Controller
{
    use RespondsWithApiPagination;

    public function __construct(private readonly ResearchFileStorage $researchFileStorage) {}

    public function research(Request $request): JsonResponse
    {
        $query = Research::query()
            ->with(['agency', 'uploader', 'archivedBy'])
            ->whereNotNull('archived_at')
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('agency'), fn (Builder $query) => $query->whereIn('agency_id', $this->agencyIds($request->string('agency')->toString())))
            ->when($request->filled('keyword'), fn (Builder $query) => $this->applyKeyword($query, $request, ['title', 'abstract', 'archive_reason', 'authors', 'publication_year']))
            ->tap(fn (Builder $query) => $this->applyArchiveDate($query, $request))
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
        $query = ResearchFile::withTrashed()
            ->with(['research.agency', 'uploader', 'archivedBy'])
            ->whereNotNull('archived_at')
            ->where('status', '!=', 'deleted')
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('agency'), fn (Builder $query) => $query->whereIn('agency_id', $this->agencyIds($request->string('agency')->toString())))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->when($request->filled('keyword'), fn (Builder $query) => $this->applyKeyword($query, $request, ['original_name', 'file_type', 'extension', 'archive_reason'], 'research'))
            ->tap(fn (Builder $query) => $this->applyArchiveDate($query, $request))
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
            ->when($request->filled('agency'), fn (Builder $query) => $query->whereIn('id', $this->agencyIds($request->string('agency')->toString())))
            ->when($request->filled('keyword'), fn (Builder $query) => $this->applyKeyword($query, $request, ['name', 'short_name', 'type', 'archive_reason'], searchAgency: false))
            ->tap(fn (Builder $query) => $this->applyArchiveDate($query, $request))
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
            ->where('status', '!=', 'deleted')
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('agency'), fn (Builder $query) => $query->whereIn('agency_id', $this->agencyIds($request->string('agency')->toString())))
            ->when($request->filled('keyword'), fn (Builder $query) => $this->applyKeyword($query, $request, ['name', 'email', 'role', 'archive_reason']))
            ->tap(fn (Builder $query) => $this->applyArchiveDate($query, $request))
            ->orderBy('archived_at', $this->sortDirection($request));

        $paginator = $query->paginate($this->perPage($request));

        return $this->archivePaginatedResponse(
            'Admin archived users retrieved.',
            $paginator,
            $paginator->getCollection()->map(fn (User $user): array => $this->userPayload($user))->values()->all(),
        );
    }

    public function activity(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->with(['user:id,name,email', 'agency:id,name,short_name'])
            ->where(function (Builder $query): void {
                $query->where('event', 'like', '%archived%')
                    ->orWhere('event', 'like', '%restored%')
                    ->orWhere('event', 'like', '%deleted%')
                    ->orWhere('event', 'like', '%removed%');
            })
            ->latest('created_at');

        $recentlyRestored = (clone $query)->where('event', 'like', '%restored%')->count();
        $paginator = $query->paginate($this->perPage($request));
        $activities = $paginator->getCollection()
            ->map(fn (AuditLog $log): array => $this->activityPayload($log))
            ->values();

        return ApiResponse::success('Admin archive activity retrieved.', $activities, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'recently_restored' => $recentlyRestored,
        ]);
    }

    public function filterOptions(): JsonResponse
    {
        $agencyIds = collect()
            ->merge(Research::query()->whereNotNull('archived_at')->whereNotNull('agency_id')->distinct()->pluck('agency_id'))
            ->merge(ResearchFile::withTrashed()->whereNotNull('archived_at')->whereNotNull('agency_id')->distinct()->pluck('agency_id'))
            ->merge(User::withTrashed()->whereNotNull('archived_at')->whereNotNull('agency_id')->distinct()->pluck('agency_id'))
            ->merge(Agency::withTrashed()->whereNotNull('archived_at')->pluck('id'))
            ->unique();

        $agencies = Agency::withTrashed()
            ->whereIn('id', $agencyIds)
            ->orderBy('name')
            ->get(['name', 'short_name'])
            ->map(fn (Agency $agency): string => $agency->short_name ?: $agency->name)
            ->unique()
            ->values();

        return ApiResponse::success('Archive filter options retrieved.', ['agencies' => $agencies]);
    }

    public function export(Request $request): StreamedResponse
    {
        $fileName = 'admin-archive-report-'.now()->format('Ymd-His').'.csv';

        AuditLogger::record($request, 'archive_report.exported', null, null, null, [
            'include_research' => $request->boolean('include_research', true),
            'include_files' => $request->boolean('include_files', true),
            'include_agencies' => $request->boolean('include_agencies', true),
            'include_users' => $request->boolean('include_users', true),
        ]);

        return response()->streamDownload(function () use ($request): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Type', 'Title', 'Agency', 'Archived By', 'Archive Date', 'Status']);

            $this->writeExportRows($handle, $request);

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function restoreFile(Request $request, ResearchFile $file): JsonResponse
    {
        if ($file->status === 'deleted') {
            return ApiResponse::error('This research file was permanently deleted and cannot be restored.', [], 410);
        }

        if (! $file->archived_at) {
            return ApiResponse::error('This research file is not archived.', [], 422);
        }

        $file->loadMissing(['research.agency']);

        if (! $file->research || $file->research->trashed() || $file->research->archived_at) {
            return ApiResponse::error('Restore the parent research record before restoring this file.', [], 409);
        }

        if (! $file->research->agency || $file->research->agency->trashed() || $file->research->agency->archived_at) {
            return ApiResponse::error('Restore the owning agency before restoring this file.', [], 409);
        }

        if (! $this->researchFileStorage->exists($file)) {
            return ApiResponse::error(
                'The archived file cannot be restored because its stored object is missing.',
                [],
                409,
            );
        }

        $archiveRecord = ArchiveRecord::query()
            ->where('archivable_type', $file->getMorphClass())
            ->where('archivable_id', $file->id)
            ->whereNull('restored_at')
            ->latest('archived_at')
            ->first();
        $oldValues = $file->only(['status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by']);

        DB::transaction(function () use ($request, $file, $archiveRecord, $oldValues): void {
            if ($file->trashed()) {
                $file->restore();
            }

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
        if ($agency->status === 'deleted') {
            return ApiResponse::error('This agency was permanently deleted and cannot be restored.', [], 410);
        }

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
        if ($user->status === 'deleted') {
            return ApiResponse::error('This user was permanently deleted and cannot be restored.', [], 410);
        }

        if (! $user->archived_at && ! $user->trashed()) {
            return ApiResponse::error('This user is not archived.', [], 422);
        }

        $oldValues = $user->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'restored_at', 'restored_by', 'deleted_at']);
        $previousValues = $this->latestArchiveOldValues($user);
        $roleSlug = (string) ($previousValues['role'] ?? $user->role);
        $role = $this->restorableRole($roleSlug);
        $agencyId = $this->restorableAgencyId($previousValues['agency_id'] ?? $user->agency_id);

        if ($roleSlug === 'agency_admin' && $agencyId === null) {
            return ApiResponse::error('Restore the user\'s agency before restoring this agency administrator.', [], 409);
        }

        DB::transaction(function () use ($request, $user, $oldValues, $role, $agencyId): void {
            if ($user->trashed()) {
                $user->restore();
            }

            $user->forceFill([
                'agency_id' => $agencyId,
                'role' => $role->slug,
                'status' => 'active',
                'archived_at' => null,
                'archived_by' => null,
                'archive_reason' => null,
                'restored_at' => now(),
                'restored_by' => $request->user()->id,
            ])->save();

            $user->roles()->sync([
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
            $research->forceFill(['status' => 'deleted'])->save();
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
            $file->forceFill(['status' => 'deleted'])->save();

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

        if (! $this->researchFileStorage->deleteIfUnreferenced($file)) {
            Log::error('Archived research file metadata was deleted but its stored object could not be removed.', [
                'research_file_id' => $file->id,
                'disk' => $file->disk,
                'path' => $file->path,
            ]);

            return ApiResponse::success(
                'Archived research file deleted. Stored-object cleanup requires administrator attention.',
                $responseData,
                ['storage_cleanup_pending' => true],
            );
        }

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
            $agency->forceFill(['status' => 'deleted'])->save();

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
            $user->forceFill(['status' => 'deleted'])->save();
            $user->roles()->detach();

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

    /** @return array<int, int> */
    private function agencyIds(string $agency): array
    {
        return Agency::withTrashed()
            ->where(fn (Builder $query) => $query->where('short_name', $agency)->orWhere('name', $agency))
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    /** @param array<int, string> $columns */
    private function applyKeyword(
        Builder $query,
        Request $request,
        array $columns,
        ?string $relatedTitle = null,
        bool $searchAgency = true,
    ): void {
        $keywords = preg_split('/\s+/', $request->string('keyword')->trim()->toString()) ?: [];

        foreach ($keywords as $value) {
            $keyword = '%'.$value.'%';
            $query->where(function (Builder $query) use ($columns, $keyword, $relatedTitle, $searchAgency): void {
                foreach ($columns as $index => $column) {
                    $index === 0
                        ? $query->where($column, 'like', $keyword)
                        : $query->orWhere($column, 'like', $keyword);
                }

                if ($relatedTitle) {
                    $query->orWhereHas($relatedTitle, fn (Builder $query) => $query->where('title', 'like', $keyword));
                }

                if ($searchAgency) {
                    $query->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                }

                $query->orWhereHas('archivedBy', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('email', 'like', $keyword));
            });
        }
    }

    private function applyArchiveDate(Builder $query, Request $request): void
    {
        match ($request->query('date')) {
            'last-7-days' => $query->where('archived_at', '>=', now()->subDays(7)->startOfDay()),
            'last-30-days' => $query->where('archived_at', '>=', now()->subDays(30)->startOfDay()),
            'this-month' => $query->whereBetween('archived_at', [now()->startOfMonth(), now()->endOfMonth()]),
            'year-2026' => $query->whereYear('archived_at', 2026),
            default => null,
        };
    }

    /** @param resource $handle */
    private function writeExportRows($handle, Request $request): void
    {
        $includeResearch = $request->boolean('include_research', true);
        $includeFiles = $request->boolean('include_files', true);
        $includeAgencies = $request->boolean('include_agencies', true);
        $includeUsers = $request->boolean('include_users', true);
        if ($includeResearch) {
            Research::query()
                ->with(['agency', 'archivedBy'])
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->lazy(200)
                ->each(function (Research $research) use ($handle): void {
                    fputcsv($handle, CsvExport::row([
                        'Research',
                        $research->title,
                        $research->agency?->short_name ?: $research->agency?->name ?: '',
                        $research->archivedBy?->name ?: 'System',
                        $research->archived_at?->toISOString() ?? '',
                        $research->status,
                    ]));
                });
        }

        if ($includeFiles) {
            ResearchFile::query()
                ->with(['research.agency', 'archivedBy'])
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->lazy(200)
                ->each(function (ResearchFile $file) use ($handle): void {
                    fputcsv($handle, CsvExport::row([
                        'File',
                        $file->original_name,
                        $file->research?->agency?->short_name ?: $file->research?->agency?->name ?: '',
                        $file->archivedBy?->name ?: 'System',
                        $file->archived_at?->toISOString() ?? '',
                        $file->status,
                    ]));
                });
        }

        if ($includeAgencies) {
            Agency::query()
                ->with('archivedBy')
                ->whereNotNull('archived_at')
                ->orderBy('archived_at', 'desc')
                ->lazy(200)
                ->each(function (Agency $agency) use ($handle): void {
                    fputcsv($handle, CsvExport::row([
                        'Agency',
                        $agency->name,
                        $agency->short_name ?: '',
                        $agency->archivedBy?->name ?: 'System',
                        $agency->archived_at?->toISOString() ?? '',
                        $agency->status,
                    ]));
                });
        }

        if ($includeUsers) {
            User::withTrashed()
                ->with(['agency', 'archivedBy'])
                ->whereNotNull('archived_at')
                ->where('status', '!=', 'deleted')
                ->orderBy('archived_at', 'desc')
                ->lazy(200)
                ->each(function (User $user) use ($handle): void {
                    fputcsv($handle, CsvExport::row([
                        'User',
                        $user->name,
                        $user->agency?->short_name ?: $user->agency?->name ?: '',
                        $user->archivedBy?->name ?: 'System',
                        $user->archived_at?->toISOString() ?? '',
                        $user->status,
                    ]));
                });
        }
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

    private function restorableRole(string $slug): Role
    {
        $role = Role::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $role) {
            abort(409, 'The user\'s original role is unavailable. Restore or replace that role before restoring the user.');
        }

        return $role;
    }
}
