<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccessRequestResource;
use App\Http\Resources\AuditLogResource;
use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminAccessMonitoringController extends Controller
{
    use RespondsWithApiPagination;

    public function index(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($request);

        $summaryQuery = clone $query;
        $summary = [
            'total' => (clone $summaryQuery)->count(),
            'pending' => (clone $summaryQuery)->where('status', 'pending')->count(),
            'approved' => (clone $summaryQuery)->where('status', 'approved')->count(),
            'denied' => (clone $summaryQuery)->where('status', 'denied')->count(),
        ];

        $paginator = $query->paginate($this->perPage($request));

        return ApiResponse::success(
            'Admin access monitoring retrieved.',
            AccessRequestResource::collection($paginator->getCollection())->resolve($request),
            [
                'summary' => $summary,
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

    public function show(Request $request, AccessRequest $accessRequest): JsonResponse
    {
        $accessRequest->load(['research.agency', 'requester', 'reviewer']);

        return ApiResponse::success(
            'Admin access request retrieved.',
            (new AccessRequestResource($accessRequest))->resolve($request),
        );
    }

    public function markReviewed(Request $request, AccessRequest $accessRequest): JsonResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        AuditLogger::record(
            $request,
            'access_request.audit_reviewed',
            $accessRequest,
            null,
            ['audit_status' => 'reviewed'],
            ['notes' => $validated['notes'] ?? null],
        );

        return ApiResponse::success(
            'Access request audit marked reviewed.',
            (new AccessRequestResource($accessRequest->load(['research.agency', 'requester', 'reviewer'])))->resolve($request),
        );
    }

    public function overrideDeny(Request $request, AccessRequest $accessRequest): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $oldValues = $accessRequest->only(['status', 'reviewed_by', 'reviewed_at', 'review_notes']);

        $accessRequest->forceFill([
            'status' => 'denied',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['reason'],
        ])->save();

        AuditLogger::record(
            $request,
            'access_request.override_denied',
            $accessRequest,
            $oldValues,
            $accessRequest->only(['status', 'reviewed_by', 'reviewed_at', 'review_notes']),
        );

        return ApiResponse::success(
            'Access request decision overridden.',
            (new AccessRequestResource($accessRequest->load(['research.agency', 'requester', 'reviewer'])))->resolve($request),
        );
    }

    public function events(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->with(['user', 'agency'])
            ->where(function (Builder $query): void {
                $query->where('auditable_type', (new AccessRequest)->getMorphClass())
                    ->orWhere('event', 'like', 'access_request.%');
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Access monitoring events retrieved.',
            $query->paginate($this->perPage($request)),
            AuditLogResource::class,
            $request,
        );
    }

    public function export(Request $request): StreamedResponse
    {
        $fileName = 'access-monitoring-'.now()->format('Y-m-d').'.csv';

        AuditLogger::record(
            $request,
            'access_monitoring.exported',
            null,
            null,
            null,
            $request->query(),
        );

        return response()->streamDownload(function () use ($request): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Research', 'Agency', 'Requester Email', 'Status', 'Requested At', 'Reviewed At']);

            $this->filteredQuery($request)
                ->chunk(200, function ($accessRequests) use ($handle): void {
                    foreach ($accessRequests as $accessRequest) {
                        fputcsv($handle, [
                            $accessRequest->id,
                            $accessRequest->research?->title,
                            $accessRequest->research?->agency?->short_name ?: $accessRequest->research?->agency?->name,
                            $accessRequest->requester_email,
                            $accessRequest->status,
                            $accessRequest->requested_at?->toDateTimeString() ?: $accessRequest->created_at?->toDateTimeString(),
                            $accessRequest->reviewed_at?->toDateTimeString(),
                        ]);
                    }
                });

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    private function filteredQuery(Request $request): Builder
    {
        return AccessRequest::query()
            ->with(['research.agency', 'requester', 'reviewer'])
            ->when($request->filled('agency_id'), function (Builder $query) use ($request): void {
                $agencyId = $request->integer('agency_id');

                $query->where(function (Builder $query) use ($agencyId): void {
                    $query->where('agency_id', $agencyId)
                        ->orWhereHas('research', fn (Builder $query) => $query->where('agency_id', $agencyId));
                });
            })
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('decision_status'), fn (Builder $query) => $query->where('status', $request->string('decision_status')))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->when($request->filled('requester_email'), fn (Builder $query) => $query->where('requester_email', 'like', '%'.$request->string('requester_email')->trim().'%'))
            ->when($request->filled('access_level'), fn (Builder $query) => $query->whereHas('research', fn (Builder $query) => $query->where('access_level', $request->string('access_level'))))
            ->when($request->filled('date_from'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('date_to')))
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('search')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('requester_name', 'like', $keyword)
                        ->orWhere('requester_email', 'like', $keyword)
                        ->orWhere('requester_affiliation', 'like', $keyword)
                        ->orWhereHas('research', fn (Builder $query) => $query->where('title', 'like', $keyword))
                        ->orWhereHas('research.agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                });
            })
            ->orderBy('created_at', $this->sortDirection($request));
    }
}
