<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Api\Concerns\ValidatesProjectReportAnalyticsFilters;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectReportAnalyticsDetailResource;
use App\Http\Resources\ProjectReportAnalyticsRecordResource;
use App\Models\Research;
use App\Services\Analytics\ProjectReportAnalyticsService;
use App\Services\Analytics\ReportTypeResolver;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgencyProjectReportAnalyticsController extends Controller
{
    use RespondsWithApiPagination;
    use ValidatesProjectReportAnalyticsFilters;

    public function __construct(
        private readonly ProjectReportAnalyticsService $analytics,
        private readonly ReportTypeResolver $reportTypeResolver,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request);

        return ApiResponse::success(
            'Agency project report analytics summary retrieved.',
            $this->analytics->summary($filters, $request->user()->agency_id),
        );
    }

    public function status(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request);

        return ApiResponse::success(
            'Agency project report analytics status retrieved.',
            $this->analytics->status($filters, $request->user()->agency_id),
        );
    }

    public function budget(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request);

        return ApiResponse::success(
            'Agency project report budget analytics retrieved.',
            $this->analytics->budget($filters, $request->user()->agency_id),
        );
    }

    public function records(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request);

        return $this->paginatedResponse(
            'Agency project report analytics records retrieved.',
            $this->analytics->records($filters, $request->user()->agency_id),
            ProjectReportAnalyticsRecordResource::class,
            $request,
        );
    }

    public function show(Request $request, Research $research): JsonResponse
    {
        if ((int) $research->agency_id !== (int) $request->user()->agency_id) {
            return ApiResponse::error('This report is outside your agency scope.', [], 403);
        }

        if (
            $research->archived_at !== null ||
            in_array($research->status, [Statuses::RESEARCH_ARCHIVED, Statuses::RESEARCH_SUPERSEDED], true)
        ) {
            return ApiResponse::error('This project report is not available.', [], 404);
        }

        $research->load([
            'agency:id,name,short_name',
            'reportDetail',
            'performanceItems',
            'files' => fn ($query) => $query
                ->select('id', 'research_id', 'file_type', 'status', 'archived_at')
                ->whereNull('archived_at')
                ->where('status', 'active'),
        ]);

        if (! $this->reportTypeResolver->isReport($research)) {
            return ApiResponse::error('This record is not a project report.', [], 404);
        }

        return ApiResponse::success(
            'Agency project report analytics detail retrieved.',
            (new ProjectReportAnalyticsDetailResource($research))->resolve($request),
        );
    }
}
