<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccessRequestResource;
use App\Http\Resources\AgencyResource;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\PlatformSettingResource;
use App\Http\Resources\ResearchResource;
use App\Http\Resources\SecurityEventResource;
use App\Http\Resources\UserResource;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReadController extends Controller
{
    use RespondsWithApiPagination;

    public function dashboard(Request $request): JsonResponse
    {
        return ApiResponse::success('Admin dashboard retrieved.', [
            'metrics' => [
                'total_agencies' => Agency::query()->count(),
                'active_agencies' => Agency::query()->where('status', 'active')->count(),
                'total_users' => User::query()->count(),
                'total_research' => Research::query()->count(),
                'published_research' => Research::query()->where('status', Statuses::RESEARCH_PUBLISHED)->count(),
                'pending_research_approvals' => ResearchApproval::query()->where('status', 'pending')->count(),
                'access_requests' => AccessRequest::query()->count(),
                'pending_access_requests' => AccessRequest::query()->where('status', Statuses::ACCESS_REQUEST_PENDING)->count(),
                'security_events' => SecurityEvent::query()->count(),
                'unresolved_security_events' => SecurityEvent::query()->whereNull('resolved_at')->count(),
            ],
            'recent_audit_logs' => AuditLogResource::collection(
                AuditLog::query()->with(['user', 'agency'])->latest('created_at')->limit(5)->get(),
            )->resolve($request),
            'recent_security_events' => SecurityEventResource::collection(
                SecurityEvent::query()->with(['user', 'agency'])->latest('created_at')->limit(5)->get(),
            )->resolve($request),
            'research_by_agency' => Agency::query()
                ->withCount('research')
                ->orderByDesc('research_count')
                ->limit(8)
                ->get()
                ->map(fn (Agency $agency): array => [
                    'agency' => $agency->short_name ?: $agency->name,
                    'count' => (int) $agency->research_count,
                ]),
            'research_uploads_by_year' => Research::query()
                ->whereNotNull('publication_year')
                ->selectRaw('publication_year, count(*) as aggregate')
                ->groupBy('publication_year')
                ->orderBy('publication_year')
                ->get()
                ->map(fn (Research $record): array => [
                    'year' => (int) $record->publication_year,
                    'count' => (int) $record->aggregate,
                ]),
        ]);
    }

    public function agencies(Request $request): JsonResponse
    {
        $query = Agency::query()
            ->withCount('research')
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('short_name', 'like', $keyword)
                        ->orWhere('full_name', 'like', $keyword)
                        ->orWhere('email', 'like', $keyword);
                });
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin agencies retrieved.',
            $query->paginate($this->perPage($request)),
            AgencyResource::class,
            $request,
        );
    }

    public function agencyShow(Request $request, Agency $agency): JsonResponse
    {
        return ApiResponse::success(
            'Admin agency detail retrieved.',
            (new AgencyResource($agency->load(['users.roles'])->loadCount('research')))->resolve($request),
        );
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query()
            ->with(['agency', 'roles'])
            ->when($request->filled('role'), function (Builder $query) use ($request): void {
                $role = $request->string('role')->toString();

                $query->where(function (Builder $query) use ($role): void {
                    $query->where('role', $role)
                        ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', $role));
                });
            })
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('first_name', 'like', $keyword)
                        ->orWhere('last_name', 'like', $keyword)
                        ->orWhere('email', 'like', $keyword);
                });
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin users retrieved.',
            $query->paginate($this->perPage($request)),
            UserResource::class,
            $request,
        );
    }

    public function userShow(Request $request, User $user): JsonResponse
    {
        return ApiResponse::success(
            'Admin user detail retrieved.',
            (new UserResource($user->load(['agency', 'roles'])))->resolve($request),
        );
    }

    public function research(Request $request): JsonResponse
    {
        $query = Research::query()
            ->with(['agency', 'uploader'])
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('publication_year'), fn (Builder $query) => $query->where('publication_year', $request->integer('publication_year')))
            ->when($request->filled('access_level'), fn (Builder $query) => $query->where('access_level', $request->string('access_level')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('title', 'like', $keyword)
                        ->orWhere('abstract', 'like', $keyword)
                        ->orWhere('category', 'like', $keyword)
                        ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                });
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin research retrieved.',
            $query->paginate($this->perPage($request)),
            ResearchResource::class,
            $request,
        );
    }

    public function researchShow(Request $request, Research $research): JsonResponse
    {
        return ApiResponse::success(
            'Admin research detail retrieved.',
            (new ResearchResource($research->load(['agency', 'uploader', 'files'])))->resolve($request),
        );
    }

    public function accessRequests(Request $request): JsonResponse
    {
        $query = AccessRequest::query()
            ->with(['research.agency', 'requester', 'reviewer'])
            ->when($request->filled('agency_id'), function (Builder $query) use ($request): void {
                $agencyId = $request->integer('agency_id');

                $query->where(function (Builder $query) use ($agencyId): void {
                    $query->where('agency_id', $agencyId)
                        ->orWhereHas('research', fn (Builder $query) => $query->where('agency_id', $agencyId));
                });
            })
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin access requests retrieved.',
            $query->paginate($this->perPage($request)),
            AccessRequestResource::class,
            $request,
        );
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->with(['user', 'agency'])
            ->when($request->filled('event'), fn (Builder $query) => $query->where('event', $request->string('event')))
            ->when($request->filled('user_id'), fn (Builder $query) => $query->where('user_id', $request->integer('user_id')))
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('date'), fn (Builder $query) => $query->whereDate('created_at', $request->date('date')))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin audit logs retrieved.',
            $query->paginate($this->perPage($request)),
            AuditLogResource::class,
            $request,
        );
    }

    public function securityEvents(Request $request): JsonResponse
    {
        $query = SecurityEvent::query()
            ->with(['user', 'agency'])
            ->when($request->filled('event_type'), fn (Builder $query) => $query->where('event_type', $request->string('event_type')))
            ->when($request->filled('severity'), fn (Builder $query) => $query->where('severity', $request->string('severity')))
            ->when($request->has('resolved'), function (Builder $query) use ($request): void {
                $request->boolean('resolved')
                    ? $query->whereNotNull('resolved_at')
                    : $query->whereNull('resolved_at');
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin security events retrieved.',
            $query->paginate($this->perPage($request)),
            SecurityEventResource::class,
            $request,
        );
    }

    public function platformSettings(Request $request): JsonResponse
    {
        $query = PlatformSetting::query()
            ->when($request->filled('group'), fn (Builder $query) => $query->where('group', $request->string('group')))
            ->when($request->has('public'), fn (Builder $query) => $query->where('is_public', $request->boolean('public')))
            ->orderBy('group')
            ->orderBy('key');

        return $this->paginatedResponse(
            'Admin platform settings retrieved.',
            $query->paginate($this->perPage($request)),
            PlatformSettingResource::class,
            $request,
        );
    }
}
