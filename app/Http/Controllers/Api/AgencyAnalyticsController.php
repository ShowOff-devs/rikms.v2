<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessRequest;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Support\ApiResponse;
use App\Support\CsvExport;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AgencyAnalyticsController extends Controller
{
    private const CATEGORY_COLORS = ['#1e3a8a', '#009966', '#f97316', '#7c3aed', '#64748b', '#dc2626'];

    public function show(Request $request): JsonResponse
    {
        $filters = $this->filters($request);
        $records = $this->filteredResearch($request, $filters);
        $allRecords = $this->baseResearch($request)->get();
        $downloadActivity = $this->downloadActivity($request, $records);

        return ApiResponse::success('Agency analytics retrieved.', [
            'filters' => $filters,
            'summaryMetrics' => $this->summaryMetrics($records, $allRecords, $filters),
            'yearlyPublications' => $this->yearlyPublications($records),
            'categoryDistribution' => $this->categoryDistribution($records),
            'sdgContributions' => $this->sdgContributions($records),
            'mostAccessedResearch' => $this->mostAccessedResearch($records),
            'accessRequestBreakdown' => $this->accessRequestBreakdown($records),
            'downloadTrends' => $downloadActivity['trends'],
            'records' => $records->map(fn (Research $research): array => $this->analyticsRecord(
                $research,
                $downloadActivity['byResearch'][(string) $research->id] ?? array_fill(0, 12, 0),
            ))->values(),
            'filterOptions' => $this->filterOptions($allRecords),
        ]);
    }

    public function export(Request $request): Response
    {
        $format = $request->string('format', 'csv')->lower()->toString();
        abort_unless(in_array($format, ['csv', 'pdf'], true), 422, 'Unsupported report format.');

        $filters = $this->filters($request);
        $records = $this->filteredResearch($request, $filters);

        if ($format === 'pdf') {
            return $this->pdfExport($request, $records, $filters);
        }

        $fileName = 'agency-research-analytics-'.($filters['year'] !== 'all' ? $filters['year'] : 'all-years').'.csv';

        return response()->streamDownload(function () use ($records): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Title', 'Category', 'Year', 'Status', 'Access Type', 'Downloads', 'Views']);

            $records->each(fn (Research $research) => fputcsv($handle, CsvExport::row([
                $research->id,
                $research->title,
                $research->category,
                $research->publication_year,
                $this->analyticsStatus($research->status),
                $this->accessType($research->access_level),
                (int) $research->downloads,
                (int) $research->views_count,
            ])));

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    private function pdfExport(Request $request, Collection $records, array $filters): Response
    {
        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.agency.analytics', [
            'agency' => $request->user()->agency,
            'records' => $records,
            'filters' => $filters,
            'generatedAt' => now(),
        ])->render());
        $pdf->setPaper('a4', 'landscape');
        $pdf->render();

        $year = $filters['year'] !== 'all' ? $filters['year'] : 'all-years';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="agency-research-analytics-'.$year.'.pdf"',
        ]);
    }

    private function baseResearch(Request $request): Builder
    {
        $agencyId = $request->user()->agency_id;

        return Research::query()
            ->where('agency_id', $agencyId)
            ->whereNull('archived_at')
            ->with([
                'files' => fn ($query) => $query
                    ->whereNull('archived_at')
                    ->where('status', '!=', 'deleted')
                    ->orderByDesc('uploaded_at')
                    ->orderByDesc('id'),
            ])
            ->withCount([
                'analyticsEvents as views_count' => fn (Builder $query) => $query
                    ->where('agency_id', $agencyId)
                    ->where('event_type', 'view'),
                'accessRequests',
            ]);
    }

    private function filteredResearch(Request $request, array $filters): Collection
    {
        $records = $this->baseResearch($request)
            ->when($filters['year'] !== 'all', fn ($query) => $query->where('publication_year', (int) $filters['year']))
            ->when($filters['category'] !== 'all', fn ($query) => $query->where('category', $filters['category']))
            ->when($filters['status'] !== 'all', function ($query) use ($filters): void {
                $statuses = match ($filters['status']) {
                    'approved' => ['published'],
                    'pending' => ['draft', 'submitted', 'under_review'],
                    'denied' => ['rejected', 'returned'],
                    default => [$filters['status']],
                };

                $query->whereIn('status', $statuses);
            })
            ->when($filters['accessType'] !== 'all', fn ($query) => $query->where('access_level', $this->apiAccessLevel($filters['accessType'])))
            ->when($filters['sdg'] !== 'all', function ($query) use ($filters): void {
                $query->whereJsonContains('sdgs', $filters['sdg']);
            })
            ->latest()
            ->get();

        if ($filters['documentType'] === 'all') {
            return $records;
        }

        $documentType = (string) $filters['documentType'];

        return $records
            ->filter(fn (Research $research): bool => $this->documentType($research) === $documentType
                || $research->files->contains('file_type', $documentType))
            ->values();
    }

    private function filters(Request $request): array
    {
        return [
            'year' => $request->query('year', 'all'),
            'documentType' => $request->query('documentType', 'all'),
            'category' => $request->query('category', 'all'),
            'sdg' => $request->query('sdg', 'all'),
            'status' => $request->query('status', 'all'),
            'accessType' => $request->query('accessType', 'all'),
        ];
    }

    private function summaryMetrics(Collection $records, Collection $allRecords, array $filters): array
    {
        $previousRecords = $this->previousYearRecords($allRecords, $filters);

        return [
            $this->metric('total-research', 'Total Research', $records->count(), $previousRecords->count()),
            $this->metric('total-downloads', 'Total Downloads', $records->sum('downloads'), $previousRecords->sum('downloads')),
            $this->metric('total-views', 'Total Views', $records->sum('views_count'), $previousRecords->sum('views_count')),
            $this->metric('access-requests', 'Access Requests', $this->accessRequestCount($records), $this->accessRequestCount($previousRecords)),
        ];
    }

    private function yearlyPublications(Collection $records): array
    {
        return $records
            ->filter(fn (Research $research) => $research->publication_year !== null)
            ->groupBy('publication_year')
            ->map(fn (Collection $items, int|string $year): array => ['year' => (int) $year, 'count' => $items->count()])
            ->sortBy('year')
            ->values()
            ->all();
    }

    private function categoryDistribution(Collection $records): array
    {
        return $records
            ->filter(fn (Research $research) => filled($research->category))
            ->groupBy('category')
            ->map(fn (Collection $items, string $category): array => [
                'category' => $category,
                'count' => $items->count(),
                'color' => self::CATEGORY_COLORS[abs(crc32($category)) % count(self::CATEGORY_COLORS)],
            ])
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    private function sdgContributions(Collection $records): array
    {
        $total = max($records->count(), 1);

        return $records
            ->flatMap(fn (Research $research) => $research->sdgs ?? [])
            ->countBy()
            ->map(fn (int $count, string $sdg): array => [
                'sdg' => $sdg,
                'label' => $sdg,
                'count' => $count,
                'percentage' => (int) round(($count / $total) * 100),
            ])
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    private function mostAccessedResearch(Collection $records): array
    {
        return $records
            ->sortByDesc(fn (Research $research): int => (int) $research->downloads + (int) $research->views_count)
            ->take(8)
            ->map(fn (Research $research): array => [
                'id' => (string) $research->id,
                'title' => $research->title,
                'category' => $research->category ?: 'Uncategorized',
                'year' => $research->publication_year ?: (int) now()->year,
                'downloads' => (int) $research->downloads,
                'views' => (int) $research->views_count,
            ])
            ->values()
            ->all();
    }

    private function accessRequestBreakdown(Collection $records): array
    {
        $counts = AccessRequest::query()
            ->whereIn('research_id', $records->pluck('id'))
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'approved' => (int) ($counts['approved'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0),
            'denied' => (int) ($counts['denied'] ?? 0),
        ];
    }

    private function downloadActivity(Request $request, Collection $records): array
    {
        $months = collect(range(0, 11))
            ->map(fn (int $offset) => now()->startOfYear()->addMonths($offset));
        $researchIds = $records->pluck('id');
        $byResearch = $researchIds
            ->mapWithKeys(fn (int|string $id): array => [(string) $id => array_fill(0, 12, 0)])
            ->all();

        $trends = $months->map(function ($month, int $index) use ($request, $researchIds, &$byResearch): array {
            $counts = $researchIds->isEmpty()
                ? collect()
                : ResearchAnalyticsEvent::query()
                    ->where('agency_id', $request->user()->agency_id)
                    ->whereIn('research_id', $researchIds)
                    ->where('event_type', 'download')
                    ->where('occurred_at', '>=', $month->copy()->startOfMonth())
                    ->where('occurred_at', '<', $month->copy()->addMonth()->startOfMonth())
                    ->select('research_id')
                    ->selectRaw('count(*) as aggregate')
                    ->groupBy('research_id')
                    ->pluck('aggregate', 'research_id');

            foreach ($counts as $researchId => $count) {
                $byResearch[(string) $researchId][$index] = (int) $count;
            }

            return [
                'month' => $month->format('M'),
                'downloads' => (int) $counts->sum(),
            ];
        })->all();

        return ['trends' => $trends, 'byResearch' => $byResearch];
    }

    private function filterOptions(Collection $records): array
    {
        return [
            'years' => $records->pluck('publication_year')->filter()->unique()->sortDesc()->map(fn ($year) => (string) $year)->values()->all(),
            'documentTypes' => $records
                ->map(fn (Research $research): string => $this->documentType($research))
                ->unique()
                ->sort()
                ->values()
                ->all(),
            'categories' => $records->pluck('category')->filter()->unique()->sort()->values()->all(),
            'sdgs' => $records->flatMap(fn (Research $research) => $research->sdgs ?? [])->unique()->sort()->values()->all(),
            'statuses' => ['approved', 'pending', 'denied'],
            'accessTypes' => $records->pluck('access_level')->filter()->map(fn ($value) => $this->accessType($value))->unique()->sort()->values()->all(),
        ];
    }

    private function analyticsRecord(Research $research, array $monthlyDownloads): array
    {
        return [
            'id' => (string) $research->id,
            'title' => $research->title,
            'category' => $research->category ?: 'Uncategorized',
            'year' => $research->publication_year ?: (int) now()->year,
            'documentType' => $this->documentType($research),
            'sdgs' => $research->sdgs ?? [],
            'status' => $this->analyticsStatus($research->status),
            'accessType' => $this->accessType($research->access_level),
            'downloads' => (int) $research->downloads,
            'views' => (int) $research->views_count,
            'accessRequests' => (int) $research->access_requests_count,
            'monthlyDownloads' => $monthlyDownloads,
        ];
    }

    private function previousYearRecords(Collection $records, array $filters): Collection
    {
        $year = $filters['year'] !== 'all'
            ? (int) $filters['year']
            : (int) $records->max('publication_year');

        return $records->filter(fn (Research $research) => (int) $research->publication_year === $year - 1);
    }

    private function accessRequestCount(Collection $records): int
    {
        return (int) $records->sum('access_requests_count');
    }

    private function documentType(Research $research): string
    {
        $category = str((string) $research->category)->lower()->toString();

        if (str_contains($category, 'terminal report')) {
            return 'Terminal Report';
        }

        if (str_contains($category, 'project accomplishment')) {
            return 'Project Accomplishment Report';
        }

        $fileType = $research->files
            ->pluck('file_type')
            ->filter()
            ->first(fn (string $type): bool => $type !== 'report-highlight-supporting');

        return match ($fileType) {
            null, 'research', 'research-study', 'research_document' => 'Research Study',
            'terminal-report' => 'Terminal Report',
            'project-accomplishment', 'project-accomplishment-report' => 'Project Accomplishment Report',
            default => str($fileType)->replace(['-', '_'], ' ')->headline()->toString(),
        };
    }

    private function metric(string $id, string $label, int $current, int $previous): array
    {
        $trend = $previous > 0 ? (int) round((($current - $previous) / $previous) * 100) : ($current > 0 ? 100 : 0);

        return [
            'id' => $id,
            'label' => $label,
            'value' => $current,
            'trend' => abs($trend),
            'trendDirection' => $trend > 0 ? 'up' : ($trend < 0 ? 'down' : 'neutral'),
        ];
    }

    private function analyticsStatus(string $status): string
    {
        return match ($status) {
            'published' => 'approved',
            'rejected', 'returned' => 'denied',
            default => 'pending',
        };
    }

    private function accessType(?string $accessLevel): string
    {
        return match ($accessLevel) {
            'public' => 'public',
            'restricted' => 'restricted',
            'embargo' => 'embargo',
            'external' => 'external-link',
            default => 'request-access',
        };
    }

    private function apiAccessLevel(string $accessType): string
    {
        return $accessType === 'external-link' ? 'external' : $accessType;
    }
}
