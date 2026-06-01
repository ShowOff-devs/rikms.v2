<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminAnalyticsController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        return ApiResponse::success('Admin analytics overview retrieved.', $this->analyticsPayload($request));
    }

    public function research(Request $request): JsonResponse
    {
        return ApiResponse::success('Research analytics retrieved.', [
            'uploadTrends' => $this->researchUploadTrends($request),
            'researchByAgency' => $this->researchByAgency($request),
            'researchByCategory' => $this->researchByCategory($request),
            'sdgContribution' => $this->sdgContribution($request),
            'mostAccessedResearch' => $this->mostAccessedResearch($request),
        ]);
    }

    public function accessRequests(Request $request): JsonResponse
    {
        return ApiResponse::success('Access request analytics retrieved.', [
            'accessRequestStatus' => $this->accessRequestStatus($request),
        ]);
    }

    public function agencies(Request $request): JsonResponse
    {
        return ApiResponse::success('Agency analytics retrieved.', [
            'total' => Agency::query()->count(),
            'active' => Agency::query()->where('status', 'active')->count(),
            'researchByAgency' => $this->researchByAgency($request),
        ]);
    }

    public function security(Request $request): JsonResponse
    {
        return ApiResponse::success('Security analytics retrieved.', [
            'eventsBySeverity' => SecurityEvent::query()
                ->selectRaw('severity, count(*) as aggregate')
                ->groupBy('severity')
                ->pluck('aggregate', 'severity'),
            'unresolved' => SecurityEvent::query()->whereNull('resolved_at')->count(),
            'auditEventCounts' => AuditLog::query()
                ->selectRaw('event, count(*) as aggregate')
                ->groupBy('event')
                ->orderByDesc('aggregate')
                ->limit(10)
                ->pluck('aggregate', 'event'),
        ]);
    }

    public function export(Request $request, string $report): StreamedResponse
    {
        abort_unless(in_array($report, ['research', 'access-requests', 'moderation', 'security'], true), 404);

        AuditLogger::record(
            $request,
            'report.exported',
            null,
            null,
            null,
            ['report' => $report, 'filters' => $request->query()],
        );

        return response()->streamDownload(function () use ($report): void {
            $handle = fopen('php://output', 'w');

            if ($report === 'security') {
                fputcsv($handle, ['ID', 'Type', 'Severity', 'Resolved At', 'Created At']);
                SecurityEvent::query()->orderByDesc('created_at')->chunk(200, function ($events) use ($handle): void {
                    foreach ($events as $event) {
                        fputcsv($handle, [$event->id, $event->event_type, $event->severity, $event->resolved_at, $event->created_at]);
                    }
                });
            } elseif ($report === 'access-requests') {
                fputcsv($handle, ['ID', 'Research ID', 'Requester Email', 'Status', 'Created At']);
                AccessRequest::query()->orderByDesc('created_at')->chunk(200, function ($requests) use ($handle): void {
                    foreach ($requests as $accessRequest) {
                        fputcsv($handle, [$accessRequest->id, $accessRequest->research_id, $accessRequest->requester_email, $accessRequest->status, $accessRequest->created_at]);
                    }
                });
            } else {
                fputcsv($handle, ['ID', 'Title', 'Agency ID', 'Status', 'Publication Year', 'Downloads']);
                Research::query()->orderByDesc('created_at')->chunk(200, function ($records) use ($handle): void {
                    foreach ($records as $research) {
                        fputcsv($handle, [$research->id, $research->title, $research->agency_id, $research->status, $research->publication_year, $research->downloads]);
                    }
                });
            }

            fclose($handle);
        }, 'rikms-'.$report.'-report-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    private function analyticsPayload(Request $request): array
    {
        return [
            'metrics' => [
                ['id' => 'total-records', 'label' => 'Total Research Records', 'value' => Research::query()->count(), 'icon' => 'database'],
                ['id' => 'participating-agencies', 'label' => 'Total Participating Agencies', 'value' => Agency::query()->count(), 'icon' => 'building'],
                ['id' => 'downloads', 'label' => 'Total Downloads', 'value' => (int) Research::query()->sum('downloads'), 'icon' => 'download'],
                ['id' => 'views', 'label' => 'Total Views', 'value' => 0, 'icon' => 'eye'],
                ['id' => 'access-requests', 'label' => 'Total Access Requests', 'value' => AccessRequest::query()->count(), 'icon' => 'file'],
                ['id' => 'agency-admins', 'label' => 'Active Agency Admin Users', 'value' => User::query()->where('status', 'active')->where(function (Builder $query): void {
                    $query->where('role', 'agency_admin')->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
                })->count(), 'icon' => 'users'],
                ['id' => 'uploads', 'label' => 'Uploaded Files', 'value' => ResearchFile::query()->count(), 'icon' => 'file'],
            ],
            'uploadTrends' => $this->researchUploadTrends($request),
            'researchByAgency' => $this->researchByAgency($request),
            'researchByCategory' => $this->researchByCategory($request),
            'sdgContribution' => $this->sdgContribution($request),
            'mostAccessedResearch' => $this->mostAccessedResearch($request),
            'accessRequestStatus' => $this->accessRequestStatus($request),
            'platformUsageActivity' => $this->platformUsageActivity(),
            'filterOptions' => $this->filterOptions(),
        ];
    }

    private function researchUploadTrends(Request $request): array
    {
        return $this->researchQuery($request)
            ->whereNotNull('publication_year')
            ->selectRaw('publication_year, count(*) as aggregate')
            ->groupBy('publication_year')
            ->orderBy('publication_year')
            ->get()
            ->map(fn (Research $research): array => ['year' => (int) $research->publication_year, 'count' => (int) $research->aggregate])
            ->all();
    }

    private function researchByAgency(Request $request): array
    {
        return Agency::query()
            ->withCount(['research' => fn (Builder $query) => $this->applyResearchFilters($query, $request)])
            ->orderByDesc('research_count')
            ->limit(12)
            ->get()
            ->map(fn (Agency $agency): array => ['agency' => $agency->short_name ?: $agency->name, 'count' => (int) $agency->research_count])
            ->filter(fn (array $item): bool => $item['count'] > 0)
            ->values()
            ->all();
    }

    private function researchByCategory(Request $request): array
    {
        $colors = ['#1e3a8a', '#047857', '#b45309', '#7c3aed', '#be123c', '#0f766e'];

        return $this->researchQuery($request)
            ->selectRaw("coalesce(category, 'Uncategorized') as category_name, count(*) as aggregate")
            ->groupBy('category_name')
            ->orderByDesc('aggregate')
            ->get()
            ->values()
            ->map(fn ($row, int $index): array => [
                'category' => $row->category_name,
                'count' => (int) $row->aggregate,
                'color' => $colors[$index % count($colors)],
            ])
            ->all();
    }

    private function sdgContribution(Request $request): array
    {
        $counts = [];

        $this->researchQuery($request)
            ->whereNotNull('sdgs')
            ->select(['id', 'sdgs'])
            ->chunk(200, function ($records) use (&$counts): void {
                foreach ($records as $record) {
                    foreach (($record->sdgs ?? []) as $sdg) {
                        $key = is_array($sdg) ? ($sdg['sdg'] ?? $sdg['value'] ?? null) : $sdg;

                        if (! $key) {
                            continue;
                        }

                        $counts[$key] = ($counts[$key] ?? 0) + 1;
                    }
                }
            });

        $max = max($counts ?: [0]);

        return collect($counts)
            ->map(fn (int $count, string $sdg): array => [
                'sdg' => $sdg,
                'label' => $sdg,
                'count' => $count,
                'percentage' => $max > 0 ? (int) round(($count / $max) * 100) : 0,
            ])
            ->values()
            ->all();
    }

    private function mostAccessedResearch(Request $request): array
    {
        return $this->researchQuery($request)
            ->with('agency')
            ->orderByDesc('downloads')
            ->limit(10)
            ->get()
            ->map(fn (Research $research): array => [
                'id' => (string) $research->id,
                'title' => $research->title,
                'agency' => $research->agency?->short_name ?: $research->agency?->name ?: 'Unassigned',
                'year' => (int) ($research->publication_year ?: 0),
                'views' => 0,
                'downloads' => (int) $research->downloads,
            ])
            ->all();
    }

    private function accessRequestStatus(Request $request): array
    {
        $counts = AccessRequest::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'approved' => (int) ($counts['approved'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0),
            'denied' => (int) ($counts['denied'] ?? 0),
        ];
    }

    private function platformUsageActivity(): array
    {
        return AccessRequest::query()
            ->select(['id', 'created_at'])
            ->orderBy('created_at')
            ->get()
            ->groupBy(fn (AccessRequest $accessRequest): string => $accessRequest->created_at?->format('M') ?? 'N/A')
            ->map(fn ($records, string $month): array => [
                'month' => $month,
                'repositoryViews' => 0,
                'downloads' => 0,
                'accessRequests' => $records->count(),
            ])
            ->values()
            ->all();
    }

    private function filterOptions(): array
    {
        return [
            'agencies' => Agency::query()->orderBy('short_name')->pluck('short_name')->filter()->values()->all(),
            'publicationYears' => Research::query()->whereNotNull('publication_year')->distinct()->orderByDesc('publication_year')->pluck('publication_year')->map(fn ($year): string => (string) $year)->all(),
            'researchCategories' => Research::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->all(),
            'sdgs' => [],
            'documentTypes' => [],
            'accessTypes' => Research::query()->distinct()->orderBy('access_level')->pluck('access_level')->filter()->values()->all(),
            'statuses' => Research::query()->distinct()->orderBy('status')->pluck('status')->filter()->values()->all(),
        ];
    }

    private function researchQuery(Request $request): Builder
    {
        return $this->applyResearchFilters(Research::query(), $request);
    }

    private function applyResearchFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->filled('agency'), fn (Builder $query) => $query->whereHas('agency', fn (Builder $query) => $query->where('short_name', $request->string('agency'))->orWhere('name', $request->string('agency'))))
            ->when($request->filled('publicationYear'), fn (Builder $query) => $query->where('publication_year', $request->integer('publicationYear')))
            ->when($request->filled('researchCategory'), fn (Builder $query) => $query->where('category', $request->string('researchCategory')))
            ->when($request->filled('accessType'), fn (Builder $query) => $query->where('access_level', $request->string('accessType')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')));
    }
}
