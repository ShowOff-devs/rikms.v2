<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccessRequestResource;
use App\Http\Resources\AuditLogResource;
use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Services\AccessRequestEmailNotificationService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\CsvExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminAccessMonitoringController extends Controller
{
    use RespondsWithApiPagination;

    public function __construct(private readonly AccessRequestEmailNotificationService $emailNotifications) {}

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
        $chartSource = (clone $query)
            ->withoutEagerLoads()
            ->reorder()
            ->select(['access_requests.id', 'access_requests.research_id']);
        $requestsByAgency = DB::query()
            ->fromSub($chartSource, 'filtered_access_requests')
            ->leftJoin('research', 'research.id', '=', 'filtered_access_requests.research_id')
            ->leftJoin('agencies', 'agencies.id', '=', 'research.agency_id')
            ->selectRaw("coalesce(agencies.short_name, agencies.name, 'Unassigned') as agency, count(*) as aggregate")
            ->groupBy('agencies.id', 'agencies.short_name', 'agencies.name')
            ->orderByDesc('aggregate')
            ->get()
            ->map(fn ($row): array => ['agency' => $row->agency, 'count' => (int) $row->aggregate])
            ->all();

        $paginator = $query->paginate($this->perPage($request));

        return ApiResponse::success(
            'Admin access monitoring retrieved.',
            AccessRequestResource::collection($paginator->getCollection())->resolve($request),
            [
                'summary' => $summary,
                'requests_by_agency' => $requestsByAgency,
                'filter_options' => $this->filterOptions(),
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
        $accessRequest->load(['research.agency', 'requester', 'reviewer', 'auditLogs.user']);

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

        $accessRequest = DB::transaction(function () use ($request, $validated, $accessRequest): AccessRequest {
            $accessRequest = AccessRequest::query()->lockForUpdate()->findOrFail($accessRequest->id);

            if (! in_array($accessRequest->status, ['approved', 'denied'], true)) {
                abort(409, 'Only decided access requests can be audited.');
            }

            $alreadyReviewed = AuditLog::query()
                ->where('auditable_type', $accessRequest->getMorphClass())
                ->where('auditable_id', $accessRequest->id)
                ->where('event', 'access_request.audit_reviewed')
                ->exists();

            if ($alreadyReviewed) {
                abort(409, 'This access request decision has already been audited.');
            }

            $this->writeAudit($request, 'access_request.audit_reviewed', $accessRequest, null, [
                'audit_status' => 'reviewed',
            ], ['notes' => $validated['notes'] ?? null]);

            return $accessRequest;
        });

        return ApiResponse::success(
            'Access request audit marked reviewed.',
            (new AccessRequestResource($accessRequest->load(['research.agency', 'requester', 'reviewer', 'auditLogs.user'])))->resolve($request),
        );
    }

    public function overrideDeny(Request $request, AccessRequest $accessRequest): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $accessRequest = DB::transaction(function () use ($request, $validated, $accessRequest): AccessRequest {
            $accessRequest = AccessRequest::query()->lockForUpdate()->findOrFail($accessRequest->id);

            if ($accessRequest->status !== 'approved') {
                abort(409, 'Only approved access requests can be overridden and denied.');
            }

            $fields = [
                'status', 'reviewed_by', 'reviewed_at', 'review_notes', 'public_denial_reason',
                'internal_review_notes', 'access_expires_at', 'access_token_hash',
                'access_token_generated_at', 'access_token_last_used_at', 'access_revoked_at',
            ];
            $oldValues = $accessRequest->only($fields);

            $accessRequest->forceFill([
                'status' => 'denied',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => null,
                'public_denial_reason' => $validated['reason'],
                'internal_review_notes' => null,
                'access_expires_at' => null,
                'access_token_hash' => null,
                'access_token_generated_at' => null,
                'access_token_last_used_at' => null,
                'access_revoked_at' => now(),
            ])->save();

            $this->writeAudit(
                $request,
                'access_request.override_denied',
                $accessRequest,
                $oldValues,
                $accessRequest->only($fields),
                ['reason' => $validated['reason']],
            );

            return $accessRequest;
        });
        $emailNotification = $this->emailNotifications->queueDecisionNotificationAfterCommit(
            $accessRequest->fresh()->loadMissing(['research.agency', 'requester', 'agency']),
            'denied',
        );

        return ApiResponse::success(
            'Access request decision overridden.',
            (new AccessRequestResource($accessRequest->load(['research.agency', 'requester', 'reviewer', 'auditLogs.user'])))->resolve($request),
            ['email_notification' => $emailNotification->status],
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
                        fputcsv($handle, CsvExport::row([
                            $accessRequest->id,
                            $accessRequest->research?->title,
                            $accessRequest->research?->agency?->short_name ?: $accessRequest->research?->agency?->name,
                            $accessRequest->requester_email,
                            $accessRequest->status,
                            $accessRequest->requested_at?->toDateTimeString() ?: $accessRequest->created_at?->toDateTimeString(),
                            $accessRequest->reviewed_at?->toDateTimeString(),
                        ]));
                    }
                });

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    private function filteredQuery(Request $request): Builder
    {
        $agency = $request->query('agency_id', $request->query('agency'));

        return AccessRequest::query()
            ->with(['research.agency', 'requester', 'reviewer', 'auditLogs.user'])
            ->when($agency !== null && $agency !== '' && $agency !== 'all', function (Builder $query) use ($agency): void {
                $query->where(function (Builder $query) use ($agency): void {
                    if (is_numeric($agency)) {
                        $query->where('agency_id', (int) $agency)
                            ->orWhereHas('research', fn (Builder $query) => $query->where('agency_id', (int) $agency));

                        return;
                    }

                    $query->whereHas('research.agency', fn (Builder $query) => $query->where('name', $agency)->orWhere('short_name', $agency));
                });
            })
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('statuses'), fn (Builder $query) => $query->whereIn('status', collect(explode(',', $request->string('statuses')->toString()))->map(fn (string $status): string => trim($status))->filter()->all()))
            ->when($request->filled('decision_status'), fn (Builder $query) => $query->where('status', $request->string('decision_status')))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->when($request->filled('requester_email'), fn (Builder $query) => $query->where('requester_email', 'like', '%'.$request->string('requester_email')->trim().'%'))
            ->when($request->filled('organization'), fn (Builder $query) => $query->where('requester_affiliation', $request->string('organization')))
            ->when($request->filled('access_level'), fn (Builder $query) => $query->whereHas('research', fn (Builder $query) => $query->where('access_level', $request->string('access_level'))))
            ->when($request->filled('date_from'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('date_to')))
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $keywords = preg_split('/\s+/', $request->string('search')->trim()->toString()) ?: [];

                foreach ($keywords as $value) {
                    $keyword = '%'.$value.'%';
                    $query->where(function (Builder $query) use ($keyword): void {
                        $query->where('requester_name', 'like', $keyword)
                            ->orWhere('requester_email', 'like', $keyword)
                            ->orWhere('requester_affiliation', 'like', $keyword)
                            ->orWhereHas('research', fn (Builder $query) => $query->where('title', 'like', $keyword))
                            ->orWhereHas('research.agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                    });
                }
            })
            ->orderBy('created_at', $this->sortDirection($request));
    }

    private function filterOptions(): array
    {
        return [
            'agencies' => DB::table('access_requests')
                ->join('research', 'research.id', '=', 'access_requests.research_id')
                ->join('agencies', 'agencies.id', '=', 'research.agency_id')
                ->whereNull('access_requests.deleted_at')
                ->selectRaw('coalesce(agencies.short_name, agencies.name) as agency_name')
                ->distinct()
                ->orderBy('agency_name')
                ->pluck('agency_name')
                ->all(),
            'organizations' => AccessRequest::query()
                ->whereNotNull('requester_affiliation')
                ->distinct()
                ->orderBy('requester_affiliation')
                ->pluck('requester_affiliation')
                ->filter()
                ->values()
                ->all(),
        ];
    }

    private function writeAudit(Request $request, string $event, AccessRequest $accessRequest, ?array $oldValues, ?array $newValues, ?array $metadata = null): void
    {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'agency_id' => $request->user()?->agency_id,
            'event' => $event,
            'auditable_type' => $accessRequest->getMorphClass(),
            'auditable_id' => $accessRequest->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
