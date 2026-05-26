<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccessRequestResource;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\NotificationResource;
use App\Http\Resources\ResearchFileResource;
use App\Http\Resources\ResearchResource;
use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgencyReadController extends Controller
{
    use RespondsWithApiPagination;

    public function dashboard(Request $request): JsonResponse
    {
        $researchQuery = $this->agencyResearchQuery($request);
        $accessRequestQuery = $this->agencyAccessRequestQuery($request);
        $notificationQuery = $this->agencyNotificationQuery($request);

        $statusCounts = (clone $researchQuery)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return ApiResponse::success('Agency dashboard retrieved.', [
            'metrics' => [
                'total_research' => (clone $researchQuery)->count(),
                'published_research' => (clone $researchQuery)->where('status', Statuses::RESEARCH_PUBLISHED)->count(),
                'draft_research' => (clone $researchQuery)->where('status', Statuses::RESEARCH_DRAFT)->count(),
                'submitted_research' => (clone $researchQuery)->where('status', Statuses::RESEARCH_SUBMITTED)->count(),
                'under_review_research' => (clone $researchQuery)->where('status', Statuses::RESEARCH_UNDER_REVIEW)->count(),
                'access_requests' => (clone $accessRequestQuery)->count(),
                'pending_access_requests' => (clone $accessRequestQuery)->where('status', Statuses::ACCESS_REQUEST_PENDING)->count(),
                'notifications' => (clone $notificationQuery)->count(),
                'unread_notifications' => (clone $notificationQuery)->where('status', Statuses::NOTIFICATION_UNREAD)->count(),
            ],
            'research_status_counts' => $statusCounts,
            'research_by_year' => (clone $researchQuery)
                ->whereNotNull('publication_year')
                ->selectRaw('publication_year, count(*) as aggregate')
                ->groupBy('publication_year')
                ->orderBy('publication_year')
                ->get()
                ->map(fn (Research $record): array => [
                    'year' => (int) $record->publication_year,
                    'count' => (int) $record->aggregate,
                ]),
            'research_by_category' => (clone $researchQuery)
                ->whereNotNull('category')
                ->selectRaw('category, count(*) as aggregate')
                ->groupBy('category')
                ->orderByDesc('aggregate')
                ->limit(8)
                ->get()
                ->map(fn (Research $record): array => [
                    'category' => $record->category,
                    'count' => (int) $record->aggregate,
                ]),
            'recent_research' => ResearchResource::collection(
                (clone $researchQuery)->with('agency')->latest()->limit(5)->get(),
            )->resolve($request),
            'recent_activity' => AuditLogResource::collection(
                $this->agencyAuditLogQuery($request)->with(['user', 'agency'])->latest('created_at')->limit(5)->get(),
            )->resolve($request),
        ]);
    }

    public function research(Request $request): JsonResponse
    {
        $query = $this->agencyResearchQuery($request)
            ->with(['agency', 'uploader'])
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('publication_year'), fn (Builder $query) => $query->where('publication_year', $request->integer('publication_year')))
            ->when($request->filled('access_level'), fn (Builder $query) => $query->where('access_level', $request->string('access_level')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('title', 'like', $keyword)
                        ->orWhere('abstract', 'like', $keyword)
                        ->orWhere('category', 'like', $keyword);
                });
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Agency research retrieved.',
            $query->paginate($this->perPage($request)),
            ResearchResource::class,
            $request,
        );
    }

    public function researchShow(Request $request, Research $research): JsonResponse
    {
        if (! $this->canViewAgencyRecord($request, $research->agency_id)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return ApiResponse::success(
            'Agency research detail retrieved.',
            (new ResearchResource($research->load(['agency', 'uploader', 'files'])))->resolve($request),
        );
    }

    public function accessRequests(Request $request): JsonResponse
    {
        $query = $this->agencyAccessRequestQuery($request)
            ->with(['research.agency', 'requester', 'reviewer'])
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Agency access requests retrieved.',
            $query->paginate($this->perPage($request)),
            AccessRequestResource::class,
            $request,
        );
    }

    public function notifications(Request $request): JsonResponse
    {
        $query = $this->agencyNotificationQuery($request)
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->boolean('unread'), fn (Builder $query) => $query->whereNull('read_at')->where('status', Statuses::NOTIFICATION_UNREAD))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Agency notifications retrieved.',
            $query->paginate($this->perPage($request)),
            NotificationResource::class,
            $request,
        );
    }

    public function researchFiles(Request $request): JsonResponse
    {
        $query = $this->agencyResearchFileQuery($request)
            ->with(['research.agency', 'uploader'])
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->when($request->filled('file_type'), fn (Builder $query) => $query->where('file_type', $request->string('file_type')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('access_level'), fn (Builder $query) => $query->where('access_level', $request->string('access_level')))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Agency research files retrieved.',
            $query->paginate($this->perPage($request)),
            ResearchFileResource::class,
            $request,
        );
    }

    private function agencyResearchQuery(Request $request): Builder
    {
        $query = Research::query()->whereNull('archived_at');

        if ($request->user()->isSuperAdmin()) {
            return $query;
        }

        return $query->where('agency_id', $request->user()->agency_id);
    }

    private function agencyAccessRequestQuery(Request $request): Builder
    {
        $query = AccessRequest::query()->whereNull('archived_at');

        if ($request->user()->isSuperAdmin()) {
            return $query;
        }

        return $query->whereHas('research', fn (Builder $query) => $query->where('agency_id', $request->user()->agency_id));
    }

    private function agencyNotificationQuery(Request $request): Builder
    {
        $query = Notification::query();

        if ($request->user()->isSuperAdmin()) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($request): void {
            $query->where('agency_id', $request->user()->agency_id)
                ->orWhere('user_id', $request->user()->id);
        });
    }

    private function agencyResearchFileQuery(Request $request): Builder
    {
        $query = ResearchFile::query()->whereNull('archived_at');

        if ($request->user()->isSuperAdmin()) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($request): void {
            $query->where('agency_id', $request->user()->agency_id)
                ->orWhereHas('research', fn (Builder $query) => $query->where('agency_id', $request->user()->agency_id));
        });
    }

    private function agencyAuditLogQuery(Request $request): Builder
    {
        $query = AuditLog::query();

        if ($request->user()->isSuperAdmin()) {
            return $query;
        }

        return $query->where('agency_id', $request->user()->agency_id);
    }

    private function canViewAgencyRecord(Request $request, ?int $agencyId): bool
    {
        return $request->user()->isSuperAdmin()
            || ($agencyId !== null && (int) $agencyId === (int) $request->user()->agency_id);
    }
}
