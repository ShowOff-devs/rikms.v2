<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ExportsProjectReportAnalytics;
use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Api\Concerns\ValidatesProjectReportAnalyticsFilters;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectReportAnalyticsDetailResource;
use App\Models\Research;
use App\Services\Analytics\ProjectReportAnalyticsService;
use App\Services\Analytics\ReportTypeResolver;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminProjectReportAnalyticsController extends Controller
{
    use ExportsProjectReportAnalytics;
    use RespondsWithApiPagination;
    use ValidatesProjectReportAnalyticsFilters;

    public function __construct(
        private readonly ProjectReportAnalyticsService $analytics,
        private readonly ReportTypeResolver $reportTypeResolver,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);

        return ApiResponse::success(
            'Admin project report analytics summary retrieved.',
            $this->analytics->summary($filters, allowAgencyFilter: true),
        );
    }

    public function overview(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);

        return ApiResponse::success(
            'Admin project report analytics overview retrieved.',
            $this->analytics->overview($filters, allowAgencyFilter: true, includeAgencies: true),
        );
    }

    public function status(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);

        return ApiResponse::success(
            'Admin project report analytics status retrieved.',
            $this->analytics->status($filters, allowAgencyFilter: true),
        );
    }

    public function budget(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);

        return ApiResponse::success(
            'Admin project report budget analytics retrieved.',
            $this->analytics->budget($filters, allowAgencyFilter: true, includeAgencyGroups: true),
        );
    }

    public function agencies(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);

        return ApiResponse::success(
            'Admin project report agency analytics retrieved.',
            $this->analytics->agencyComparison($filters),
        );
    }

    public function records(Request $request): JsonResponse
    {
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);

        return $this->paginatedResponse(
            'Admin project report analytics records retrieved.',
            $this->analytics->records($filters, allowAgencyFilter: true),
            ProjectReportAnalyticsRecordResource::class,
            $request,
        );
    }

    public function export(Request $request): Response
    {
        $request->validate(['format' => ['nullable', 'in:csv,pdf']]);
        $filters = $this->reportAnalyticsFilters($request, allowAgencyFilter: true);
        $format = $request->string('format', 'pdf')->toString();

        AuditLogger::record($request, 'project_report_analytics.exported', null, null, null, [
            'format' => $format,
            'filters' => collect($filters)->except(['page', 'per_page'])->all(),
        ]);

        return $this->projectReportAnalyticsExport(
            $request,
            $this->analytics,
            $filters,
            null,
            allowAgencyFilter: true,
            includeAgencies: true,
            filenamePrefix: 'project-report-analytics',
            scopeLabel: 'Regional Terminal Report and Project Accomplishment Report metrics',
            footerLabel: 'RIKMS — Superadmin project report analytics export',
        );
    }

    public function show(Request $request, Research $research): JsonResponse
    {
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
            'Admin project report analytics detail retrieved.',
            (new ProjectReportAnalyticsDetailResource($research))->resolve($request),
        );
    }
}
