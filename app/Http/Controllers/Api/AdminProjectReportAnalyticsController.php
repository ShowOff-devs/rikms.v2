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
use App\Support\CsvExport;
use App\Support\Statuses;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminProjectReportAnalyticsController extends Controller
{
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
        $records = $this->analytics->exportRecords($filters, allowAgencyFilter: true)
            ->map(fn (Research $research): array => (new ProjectReportAnalyticsRecordResource($research))->resolve($request));

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($records): void {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['ID', 'Title', 'Agency', 'Report Type', 'Reporting Period', 'Year', 'Workflow Status', 'Completeness', 'Allotted Budget', 'Utilized Amount', 'Utilization %', 'Physical Accomplishment %']);

                foreach ($records as $record) {
                    fputcsv($handle, CsvExport::row([
                        $record['research_id'], $record['title'], $record['agency']['name'] ?? '', $record['report_type'],
                        $record['reporting_period'], $record['publication_year'], $record['workflow_status'],
                        $record['completeness']['classification'] ?? '', $record['budget']['allotted_budget'] ?? '',
                        $record['budget']['utilized_amount'] ?? '', $record['budget']['utilization_percentage'] ?? '',
                        $record['accomplishment']['physical_accomplishment_percentage'] ?? '',
                    ]));
                }

                fclose($handle);
            }, 'project-report-analytics-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
        }

        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);
        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.admin.project-report-analytics', [
            'records' => $records,
            'summary' => $this->analytics->summary($filters, allowAgencyFilter: true),
            'budget' => $this->analytics->budget($filters, allowAgencyFilter: true, includeAgencyGroups: true),
            'filters' => collect($filters)->except(['page', 'per_page', 'sort', 'direction'])->all(),
            'generatedAt' => now(),
        ])->render());
        $pdf->setPaper('a4', 'landscape');
        $pdf->render();

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="project-report-analytics-'.now()->format('Y-m-d').'.pdf"',
        ]);
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
