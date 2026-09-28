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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\LazyCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class AgencyAnalyticsController extends Controller
{
    private const CATEGORY_COLORS = ['#1e3a8a', '#009966', '#f97316', '#7c3aed', '#64748b', '#dc2626'];

    private const DASHBOARD_RECORD_LIMIT = 5000;

    private const PDF_RECORD_LIMIT = 500;

    private ?array $cachedFilterOptions = null;

    public function show(Request $request): JsonResponse
    {
        $filters = $this->filters($request);
        $records = $this->filteredResearch($request, $filters);
        $previousRecords = $filters['year'] === 'all'
            ? null
            : $this->filteredResearch($request, [
                ...$filters,
                'year' => (string) ((int) $filters['year'] - 1),
            ]);
        $downloadActivity = $this->downloadActivity($request, $records);

        return ApiResponse::success('Agency analytics retrieved.', [
            'filters' => $filters,
            'summaryMetrics' => $this->summaryMetrics($records, $previousRecords),
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
            'filterOptions' => $this->filterOptions($request),
        ]);
    }

    public function export(Request $request): Response
    {
        $format = $request->string('format', 'csv')->lower()->toString();
        abort_unless(in_array($format, ['csv', 'pdf'], true), 422, 'Unsupported report format.');

        $filters = $this->filters($request);
        if ($format === 'pdf') {
            return $this->pdfExport($request, $filters);
        }

        $fileName = 'agency-research-analytics-'.($filters['year'] !== 'all' ? $filters['year'] : 'all-years').'.csv';

        return response()->streamDownload(function () use ($request, $filters): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Title', 'Category', 'Year', 'Status', 'Access Type', 'Downloads', 'Views']);

            foreach ($this->lazyFilteredResearch($request, $filters) as $research) {
                fputcsv($handle, CsvExport::row([
                    $research->id,
                    $research->title,
                    $research->category,
                    $research->publication_year,
                    $this->analyticsStatus($research->status),
                    $this->accessType($research->access_level, $research->external_url),
                    (int) $research->downloads,
                    (int) $research->views_count,
                ]));
            }

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    private function pdfExport(Request $request, array $filters): Response
    {
        $exportRecords = $this->lazyFilteredResearch($request, $filters)
            ->take(self::PDF_RECORD_LIMIT + 1)
            ->collect();
        $isTruncated = $exportRecords->count() > self::PDF_RECORD_LIMIT;
        $records = $exportRecords->take(self::PDF_RECORD_LIMIT);
        $records->each(function (Research $research): void {
            $research->setAttribute('analytics_status', $this->analyticsStatus($research->status));
            $research->setAttribute('analytics_access_type', $this->accessType($research->access_level, $research->external_url));
        });
        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.agency.analytics', [
            'agency' => $request->user()->agency,
            'records' => $records,
            'filters' => $filters,
            'generatedAt' => now(),
            'isTruncated' => $isTruncated,
            'recordLimit' => self::PDF_RECORD_LIMIT,
            'publishedCount' => $records->whereIn('status', ['approved', 'published'])->count(),
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
            ->whereNull('superseded_by_id')
            ->whereNotIn('status', ['archived', 'superseded'])
            ->with([
                'files' => fn ($query) => $query
                    ->whereNull('archived_at')
                    ->where('status', 'active')
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
        $records = $this->filteredResearchQuery($request, $filters)
            ->limit(self::DASHBOARD_RECORD_LIMIT + 1)
            ->get();

        $this->ensureDashboardLimit($records);

        return $this->applyDocumentTypeFilter($records, $filters);
    }

    private function filteredResearchQuery(Request $request, array $filters): Builder
    {
        return $this->baseResearch($request)
            ->when($filters['year'] !== 'all', fn ($query) => $query->where('publication_year', (int) $filters['year']))
            ->when($filters['category'] !== 'all', fn ($query) => $query->where('category', $filters['category']))
            ->when($filters['status'] !== 'all', function ($query) use ($filters): void {
                $statuses = match ($filters['status']) {
                    'approved' => ['approved', 'published'],
                    'pending' => ['draft', 'submitted', 'under_review'],
                    'denied' => ['rejected'],
                    default => [$filters['status']],
                };

                $query->whereIn('status', $statuses);
            })
            ->when($filters['accessType'] !== 'all', fn (Builder $query) => $this->applyAccessTypeFilter($query, (string) $filters['accessType']))
            ->when($filters['sdg'] !== 'all', function ($query) use ($filters): void {
                $query->whereJsonContains('sdgs', $filters['sdg']);
            })
            ->latest();
    }

    private function applyDocumentTypeFilter(Collection $records, array $filters): Collection
    {

        if ($filters['documentType'] === 'all') {
            return $records;
        }

        $documentType = (string) $filters['documentType'];

        return $records
            ->filter(fn (Research $research): bool => $this->documentType($research) === $documentType)
            ->values();
    }

    private function lazyFilteredResearch(Request $request, array $filters): LazyCollection
    {
        $documentType = (string) $filters['documentType'];

        return $this->filteredResearchQuery($request, $filters)
            ->reorder('id')
            ->lazyById(250)
            ->filter(fn (Research $research): bool => $documentType === 'all'
                || $this->documentType($research) === $documentType);
    }

    private function ensureDashboardLimit(Collection $records): void
    {
        abort_if(
            $records->count() > self::DASHBOARD_RECORD_LIMIT,
            422,
            'Too many research records to analyze at once. Apply one or more filters and try again.',
        );
    }

    private function filters(Request $request): array
    {
        $options = $this->filterOptions($request);
        $validated = Validator::make($request->query(), [
            'year' => ['sometimes', 'string', Rule::in(['all', ...$options['years']])],
            'documentType' => ['sometimes', 'string', Rule::in(['all', ...$options['documentTypes']])],
            'category' => ['sometimes', 'string', Rule::in(['all', ...$options['categories']])],
            'sdg' => ['sometimes', 'string', Rule::in(['all', ...$options['sdgs']])],
            'status' => ['sometimes', 'string', Rule::in(['all', ...$options['statuses']])],
            'accessType' => ['sometimes', 'string', Rule::in(['all', ...$options['accessTypes']])],
        ])->validate();

        return [
            'year' => $validated['year'] ?? 'all',
            'documentType' => $validated['documentType'] ?? 'all',
            'category' => $validated['category'] ?? 'all',
            'sdg' => $validated['sdg'] ?? 'all',
            'status' => $validated['status'] ?? 'all',
            'accessType' => $validated['accessType'] ?? 'all',
        ];
    }

    private function summaryMetrics(Collection $records, ?Collection $previousRecords): array
    {
        return [
            $this->metric('total-research', 'Total Research', $records->count(), $previousRecords?->count()),
            $this->metric('total-downloads', 'Total Downloads', $records->sum('downloads'), $previousRecords?->sum('downloads')),
            $this->metric('total-views', 'Total Views', $records->sum('views_count'), $previousRecords?->sum('views_count')),
            $this->metric('access-requests', 'Access Requests', $this->accessRequestCount($records), $previousRecords ? $this->accessRequestCount($previousRecords) : null),
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
            ->groupBy(fn (Research $research): string => filled($research->category) ? $research->category : 'Uncategorized')
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
                'year' => $research->publication_year,
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
            'expired' => (int) ($counts['expired'] ?? 0),
            'cancelled' => (int) ($counts['cancelled'] ?? 0),
        ];
    }

    private function downloadActivity(Request $request, Collection $records): array
    {
        $startOfYear = now()->startOfYear();
        $months = collect(range(0, 11))->map(fn (int $offset) => $startOfYear->copy()->addMonths($offset));
        $researchIds = $records->pluck('id');
        $byResearch = $researchIds
            ->mapWithKeys(fn (int|string $id): array => [(string) $id => array_fill(0, 12, 0)])
            ->all();

        $monthlyTotals = array_fill(0, 12, 0);

        if ($researchIds->isNotEmpty()) {
            $driver = DB::connection()->getDriverName();
            $monthExpression = match ($driver) {
                'sqlite' => "cast(strftime('%m', occurred_at) as integer)",
                'pgsql' => 'extract(month from occurred_at)',
                default => 'month(occurred_at)',
            };

            $counts = ResearchAnalyticsEvent::query()
                ->where('agency_id', $request->user()->agency_id)
                ->whereIn('research_id', $researchIds)
                ->where('event_type', 'download')
                ->where('occurred_at', '>=', $startOfYear)
                ->where('occurred_at', '<', $startOfYear->copy()->addYear())
                ->select('research_id')
                ->selectRaw("{$monthExpression} as month_number, count(*) as aggregate")
                ->groupBy('research_id')
                ->groupByRaw($monthExpression)
                ->get();

            foreach ($counts as $count) {
                $index = (int) $count->month_number - 1;
                $byResearch[(string) $count->research_id][$index] = (int) $count->aggregate;
                $monthlyTotals[$index] += (int) $count->aggregate;
            }
        }

        $trends = $months->map(function ($month, int $index) use ($monthlyTotals): array {
            return [
                'month' => $month->format('M'),
                'downloads' => $monthlyTotals[$index],
            ];
        })->all();

        return ['trends' => $trends, 'byResearch' => $byResearch];
    }

    private function filterOptions(Request $request): array
    {
        if ($this->cachedFilterOptions !== null) {
            return $this->cachedFilterOptions;
        }

        $years = [];
        $documentTypes = [];
        $categories = [];
        $sdgs = [];
        $accessTypes = [];

        $records = Research::query()
            ->where('agency_id', $request->user()->agency_id)
            ->whereNull('archived_at')
            ->whereNull('superseded_by_id')
            ->whereNotIn('status', ['archived', 'superseded'])
            ->with([
                'files' => fn ($query) => $query
                    ->whereNull('archived_at')
                    ->where('status', 'active')
                    ->orderByDesc('uploaded_at')
                    ->orderByDesc('id'),
            ])
            ->reorder('id')
            ->lazyById(250);

        foreach ($records as $research) {
            if ($research->publication_year !== null) {
                $years[(string) $research->publication_year] = true;
            }

            $documentTypes[$this->documentType($research)] = true;

            if (filled($research->category)) {
                $categories[(string) $research->category] = true;
            }

            foreach ($research->sdgs ?? [] as $sdg) {
                $sdgs[(string) $sdg] = true;
            }

            $accessTypes[$this->accessType($research->access_level, $research->external_url)] = true;
        }

        $years = array_keys($years);
        rsort($years, SORT_NUMERIC);
        $documentTypes = array_keys($documentTypes);
        sort($documentTypes);
        $categories = array_keys($categories);
        sort($categories);
        $sdgs = array_keys($sdgs);
        sort($sdgs);
        $accessTypes = array_keys($accessTypes);
        sort($accessTypes);

        return $this->cachedFilterOptions = [
            'years' => $years,
            'documentTypes' => $documentTypes,
            'categories' => $categories,
            'sdgs' => $sdgs,
            'statuses' => ['approved', 'pending', 'denied'],
            'accessTypes' => $accessTypes,
        ];
    }

    private function analyticsRecord(Research $research, array $monthlyDownloads): array
    {
        return [
            'id' => (string) $research->id,
            'title' => $research->title,
            'category' => $research->category ?: 'Uncategorized',
            'year' => $research->publication_year,
            'documentType' => $this->documentType($research),
            'sdgs' => $research->sdgs ?? [],
            'status' => $this->analyticsStatus($research->status),
            'accessType' => $this->accessType($research->access_level, $research->external_url),
            'downloads' => (int) $research->downloads,
            'views' => (int) $research->views_count,
            'accessRequests' => (int) $research->access_requests_count,
            'monthlyDownloads' => $monthlyDownloads,
        ];
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

    private function metric(string $id, string $label, int $current, ?int $previous): array
    {
        $trend = $previous === null
            ? 0
            : ($previous > 0 ? (int) round((($current - $previous) / $previous) * 100) : ($current > 0 ? 100 : 0));

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
            'approved', 'published' => 'approved',
            'rejected' => 'denied',
            default => 'pending',
        };
    }

    private function accessType(?string $accessLevel, ?string $externalUrl = null): string
    {
        if (filled($externalUrl)) {
            return 'external-link';
        }

        return match ($accessLevel) {
            'public' => 'public',
            'restricted' => 'restricted',
            'embargo', 'embargoed' => 'embargo',
            'external' => 'external-link',
            'request_required' => 'request-access',
            default => 'request-access',
        };
    }

    private function applyAccessTypeFilter(Builder $query, string $accessType): void
    {
        match ($accessType) {
            'external-link' => $query->whereNotNull('external_url')->where('external_url', '!=', ''),
            'embargo' => $query->whereIn('access_level', ['embargo', 'embargoed']),
            'request-access' => $query->where('access_level', 'request_required')->where(function (Builder $query): void {
                $query->whereNull('external_url')->orWhere('external_url', '');
            }),
            default => $query->where('access_level', $accessType),
        };
    }
}
