<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Http\Resources\ProjectReportAnalyticsRecordResource;
use App\Models\Research;
use App\Services\Analytics\ProjectReportAnalyticsService;
use App\Support\CsvExport;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

trait ExportsProjectReportAnalytics
{
    private const PROJECT_REPORT_PDF_RECORD_LIMIT = 500;

    /**
     * @param  array<string, mixed>  $filters
     */
    private function projectReportAnalyticsExport(
        Request $request,
        ProjectReportAnalyticsService $analytics,
        array $filters,
        ?int $agencyScope,
        bool $allowAgencyFilter,
        bool $includeAgencies,
        string $filenamePrefix,
        string $scopeLabel,
        string $footerLabel,
    ): Response {
        $format = $request->string('format', 'pdf')->toString();
        $filename = $filenamePrefix.'-'.now()->format('Y-m-d');

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($analytics, $filters, $agencyScope, $allowAgencyFilter, $request): void {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['ID', 'Title', 'Agency', 'Report Type', 'Reporting Period', 'Year', 'Workflow Status', 'Completeness', 'Allotted Budget', 'Utilized Amount', 'Utilization %', 'Physical Accomplishment %']);

                foreach ($analytics->lazyExportRecords($filters, $agencyScope, $allowAgencyFilter) as $research) {
                    $record = (new ProjectReportAnalyticsRecordResource($research))->resolve($request);
                    fputcsv($handle, CsvExport::row([
                        $record['research_id'], $record['title'], $record['agency']['name'] ?? '', $record['report_type'],
                        $record['reporting_period'], $record['publication_year'], $record['workflow_status'],
                        $record['completeness']['classification'] ?? '', $record['budget']['allotted_budget'] ?? '',
                        $record['budget']['utilized_amount'] ?? '', $record['budget']['utilization_percentage'] ?? '',
                        $record['accomplishment']['physical_accomplishment_percentage'] ?? '',
                    ]));
                }

                fclose($handle);
            }, $filename.'.csv', ['Content-Type' => 'text/csv']);
        }

        $exportRecords = $analytics->exportRecords(
            $filters,
            $agencyScope,
            $allowAgencyFilter,
            self::PROJECT_REPORT_PDF_RECORD_LIMIT + 1,
        );
        $isTruncated = $exportRecords->count() > self::PROJECT_REPORT_PDF_RECORD_LIMIT;
        $records = $exportRecords
            ->take(self::PROJECT_REPORT_PDF_RECORD_LIMIT)
            ->map(fn (Research $research): array => (new ProjectReportAnalyticsRecordResource($research))->resolve($request));
        $overview = $analytics->overview($filters, $agencyScope, $allowAgencyFilter, $includeAgencies);

        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);
        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.admin.project-report-analytics', [
            'records' => $records,
            'summary' => $overview['summary'],
            'budget' => $overview['budget'],
            'filters' => collect($filters)->except(['page', 'per_page', 'sort', 'direction'])->all(),
            'generatedAt' => now(),
            'isTruncated' => $isTruncated,
            'recordLimit' => self::PROJECT_REPORT_PDF_RECORD_LIMIT,
            'scopeLabel' => $scopeLabel,
            'footerLabel' => $footerLabel,
        ])->render());
        $pdf->setPaper('a4', 'landscape');
        $pdf->render();

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'.pdf"',
        ]);
    }
}
