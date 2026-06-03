<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessRequest;
use App\Models\Research;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AgencyAnalyticsController extends Controller
{
    private const CATEGORY_COLORS = ['#1e3a8a', '#009966', '#f97316', '#7c3aed', '#64748b', '#dc2626'];

    public function show(Request $request): JsonResponse
    {
        $filters = $this->filters($request);
        $records = $this->filteredResearch($request, $filters)->get();
        $allRecords = $this->baseResearch($request)->get();

        return ApiResponse::success('Agency analytics retrieved.', [
            'filters' => $filters,
            'summaryMetrics' => $this->summaryMetrics($records, $allRecords, $filters),
            'yearlyPublications' => $this->yearlyPublications($records),
            'categoryDistribution' => $this->categoryDistribution($records),
            'sdgContributions' => $this->sdgContributions($records),
            'mostAccessedResearch' => $this->mostAccessedResearch($records),
            'accessRequestBreakdown' => $this->accessRequestBreakdown($request),
            'downloadTrends' => $this->downloadTrends($records),
            'records' => $records->map(fn (Research $research): array => $this->analyticsRecord($research))->values(),
            'filterOptions' => $this->filterOptions($allRecords),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $records = $this->filteredResearch($request, $filters)->get();
        $fileName = 'agency-research-analytics-'.($filters['year'] !== 'all' ? $filters['year'] : 'all-years').'.csv';

        return response()->streamDownload(function () use ($records): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Title', 'Category', 'Year', 'Status', 'Access Type', 'Downloads', 'Views']);

            $records->each(fn (Research $research) => fputcsv($handle, [
                $research->id,
                $research->title,
                $research->category,
                $research->publication_year,
                $this->analyticsStatus($research->status),
                $this->accessType($research->access_level),
                (int) $research->downloads,
                0,
            ]));

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    private function baseResearch(Request $request)
    {
        return Research::query()
            ->where('agency_id', $request->user()->agency_id)
            ->whereNull('archived_at');
    }

    private function filteredResearch(Request $request, array $filters)
    {
        return $this->baseResearch($request)
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
            ->latest();
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
            $this->metric('total-views', 'Total Views', 0, 0),
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
            ->sortByDesc('downloads')
            ->take(8)
            ->map(fn (Research $research): array => [
                'id' => (string) $research->id,
                'title' => $research->title,
                'category' => $research->category ?: 'Uncategorized',
                'year' => $research->publication_year ?: (int) now()->year,
                'downloads' => (int) $research->downloads,
                'views' => 0,
            ])
            ->values()
            ->all();
    }

    private function accessRequestBreakdown(Request $request): array
    {
        $counts = AccessRequest::query()
            ->whereHas('research', fn ($query) => $query->where('agency_id', $request->user()->agency_id))
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'approved' => (int) ($counts['approved'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0),
            'denied' => (int) ($counts['denied'] ?? 0),
        ];
    }

    private function downloadTrends(Collection $records): array
    {
        $months = collect(range(0, 11))
            ->map(fn (int $offset) => now()->startOfYear()->addMonths($offset));

        return $months->map(fn ($month): array => [
            'month' => $month->format('M'),
            'downloads' => $records
                ->filter(fn (Research $research) => $research->created_at?->format('Y-m') === $month->format('Y-m'))
                ->sum('downloads'),
        ])->all();
    }

    private function filterOptions(Collection $records): array
    {
        return [
            'years' => $records->pluck('publication_year')->filter()->unique()->sortDesc()->map(fn ($year) => (string) $year)->values()->all(),
            'documentTypes' => ['Research Study'],
            'categories' => $records->pluck('category')->filter()->unique()->sort()->values()->all(),
            'sdgs' => $records->flatMap(fn (Research $research) => $research->sdgs ?? [])->unique()->sort()->values()->all(),
            'statuses' => ['approved', 'pending', 'denied'],
            'accessTypes' => $records->pluck('access_level')->filter()->map(fn ($value) => $this->accessType($value))->unique()->sort()->values()->all(),
        ];
    }

    private function analyticsRecord(Research $research): array
    {
        return [
            'id' => (string) $research->id,
            'title' => $research->title,
            'category' => $research->category ?: 'Uncategorized',
            'year' => $research->publication_year ?: (int) now()->year,
            'documentType' => 'Research Study',
            'sdgs' => $research->sdgs ?? [],
            'status' => $this->analyticsStatus($research->status),
            'accessType' => $this->accessType($research->access_level),
            'downloads' => (int) $research->downloads,
            'views' => 0,
            'accessRequests' => AccessRequest::query()->where('research_id', $research->id)->count(),
            'monthlyDownloads' => array_fill(0, 12, 0),
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
        $researchIds = $records->pluck('id');

        return AccessRequest::query()->whereIn('research_id', $researchIds)->count();
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
