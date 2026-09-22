<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchFile;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\CsvExport;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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

    public function export(Request $request, string $report): Response
    {
        abort_unless(in_array($report, ['research', 'access-requests', 'moderation', 'security'], true), 404);
        abort_if($report === 'security' && ! $request->user()->hasPermission('security.view'), 403, 'Security report access is required.');

        $format = $request->string('format', 'csv')->lower()->toString();
        abort_unless(in_array($format, ['csv', 'pdf'], true), 422, 'Unsupported report format.');

        AuditLogger::record(
            $request,
            'report.exported',
            null,
            null,
            null,
            ['report' => $report, 'format' => $format, 'filters' => $request->query()],
        );

        if ($format === 'pdf') {
            return $this->pdfExport($request, $report);
        }

        $securityEvents = $report === 'security'
            ? $this->securityExportQuery($request)
            : null;

        return response()->streamDownload(function () use ($report, $request, $securityEvents): void {
            $handle = fopen('php://output', 'w');

            if ($report === 'security') {
                fputcsv($handle, ['ID', 'Type', 'Severity', 'Acknowledged At', 'Resolved At', 'Created At']);
                $securityEvents?->orderByDesc('created_at')->chunk(200, function ($events) use ($handle): void {
                    foreach ($events as $event) {
                        fputcsv($handle, CsvExport::row([$event->id, $event->event_type, $event->severity, $event->acknowledged_at, $event->resolved_at, $event->created_at]));
                    }
                });
            } elseif ($report === 'access-requests') {
                fputcsv($handle, ['ID', 'Research ID', 'Requester Email', 'Status', 'Created At']);
                AccessRequest::query()->orderByDesc('created_at')->chunk(200, function ($requests) use ($handle): void {
                    foreach ($requests as $accessRequest) {
                        fputcsv($handle, CsvExport::row([$accessRequest->id, $accessRequest->research_id, $accessRequest->requester_email, $accessRequest->status, $accessRequest->created_at]));
                    }
                });
            } else {
                fputcsv($handle, ['ID', 'Title', 'Agency ID', 'Status', 'Publication Year', 'Downloads']);
                $this->researchExportQuery($request, $report === 'moderation')->orderByDesc('created_at')->chunk(200, function ($records) use ($handle): void {
                    foreach ($records as $research) {
                        fputcsv($handle, CsvExport::row([$research->id, $research->title, $research->agency_id, $research->status, $research->publication_year, $research->downloads]));
                    }
                });
            }

            fclose($handle);
        }, 'rikms-'.$report.'-report-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    private function pdfExport(Request $request, string $report): Response
    {
        abort_unless($report === 'research', 422, 'PDF export is currently available for research reports only.');

        $records = $this->researchExportQuery($request, $report === 'moderation')
            ->with('agency:id,name')
            ->orderByDesc('created_at')
            ->get();
        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.admin.research', [
            'records' => $records,
            'generatedAt' => now(),
            'filters' => $request->only(['date_range', 'start_date', 'end_date', 'search', 'agency', 'publicationYear', 'researchCategory', 'sdg', 'documentType', 'status']),
        ])->render());
        $pdf->setPaper('a4', 'landscape');
        $pdf->render();

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="rikms-research-report-'.now()->format('Y-m-d').'.pdf"',
        ]);
    }

    private function securityExportQuery(Request $request): Builder
    {
        $query = SecurityEvent::query();

        return match ($request->query('date_range')) {
            'last-7-days' => $query->where('created_at', '>=', now()->subDays(7)->startOfDay()),
            'last-30-days' => $query->where('created_at', '>=', now()->subDays(30)->startOfDay()),
            'this-month' => $query->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]),
            'this-year' => $query->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()]),
            'custom' => $query
                ->when($request->date('start_date'), fn (Builder $query, $date) => $query->where('created_at', '>=', $date->startOfDay()))
                ->when($request->date('end_date'), fn (Builder $query, $date) => $query->where('created_at', '<=', $date->endOfDay())),
            default => $query,
        };
    }

    private function researchExportQuery(Request $request, bool $moderation = false): Builder
    {
        $query = $this->researchQuery($request);

        if ($moderation) {
            $query->whereIn('status', ['submitted', 'under_review', 'approved', 'rejected']);
        }

        if ($request->filled('statuses')) {
            $statuses = collect(explode(',', $request->string('statuses')->toString()))
                ->map(fn (string $status): string => trim($status))
                ->filter()
                ->all();

            $query->whereIn('status', $statuses);
        }

        return match ($request->query('date_range')) {
            'last-7-days' => $query->where('created_at', '>=', now()->subDays(7)->startOfDay()),
            'last-30-days' => $query->where('created_at', '>=', now()->subDays(30)->startOfDay()),
            'this-month' => $query->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]),
            'this-year' => $query->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()]),
            'custom' => $query
                ->when($request->date('start_date'), fn (Builder $query, $date) => $query->where('created_at', '>=', $date->startOfDay()))
                ->when($request->date('end_date'), fn (Builder $query, $date) => $query->where('created_at', '<=', $date->endOfDay())),
            default => $query,
        };
    }

    private function analyticsPayload(Request $request): array
    {
        $filteredResearchIds = $this->researchQuery($request)->pluck('id');
        $filteredAgencyIds = $this->researchQuery($request)->whereNotNull('agency_id')->distinct()->pluck('agency_id');

        return [
            'metrics' => [
                ['id' => 'total-records', 'label' => 'Total Research Records', 'value' => $filteredResearchIds->count(), 'icon' => 'database'],
                ['id' => 'participating-agencies', 'label' => 'Total Participating Agencies', 'value' => $filteredAgencyIds->count(), 'icon' => 'building'],
                ['id' => 'downloads', 'label' => 'Total Downloads', 'value' => (int) $this->researchQuery($request)->sum('downloads'), 'icon' => 'download'],
                ['id' => 'views', 'label' => 'Total Views', 'value' => $this->analyticsEventCount($filteredResearchIds, 'view'), 'icon' => 'eye'],
                ['id' => 'access-requests', 'label' => 'Total Access Requests', 'value' => AccessRequest::query()->whereIn('research_id', $filteredResearchIds)->count(), 'icon' => 'file'],
                ['id' => 'agency-admins', 'label' => 'Active Agency Admin Users', 'value' => User::query()->where('status', 'active')->where(function (Builder $query): void {
                    $query->where('role', 'agency_admin')->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
                })->whereIn('agency_id', $filteredAgencyIds)->count(), 'icon' => 'users'],
                ['id' => 'uploads', 'label' => 'Uploaded Files', 'value' => ResearchFile::query()->whereIn('research_id', $filteredResearchIds)->where('status', '!=', 'deleted')->whereNull('archived_at')->count(), 'icon' => 'file'],
            ],
            'uploadTrends' => $this->researchUploadTrends($request),
            'researchByAgency' => $this->researchByAgency($request),
            'researchByCategory' => $this->researchByCategory($request),
            'sdgContribution' => $this->sdgContribution($request),
            'mostAccessedResearch' => $this->mostAccessedResearch($request),
            'accessRequestStatus' => $this->accessRequestStatus($request),
            'platformUsageActivity' => $this->platformUsageActivity($request),
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
            ->withCount(['analyticsEvents as views_count' => fn (Builder $query) => $query->where('event_type', 'view')])
            ->orderByDesc('downloads')
            ->orderByDesc('views_count')
            ->limit(10)
            ->get()
            ->map(fn (Research $research): array => [
                'id' => (string) $research->id,
                'title' => $research->title,
                'agency' => $research->agency?->short_name ?: $research->agency?->name ?: 'Unassigned',
                'year' => (int) ($research->publication_year ?: 0),
                'views' => (int) $research->views_count,
                'downloads' => (int) $research->downloads,
            ])
            ->all();
    }

    private function accessRequestStatus(Request $request): array
    {
        $researchIds = $this->researchQuery($request)->pluck('id');
        $counts = AccessRequest::query()
            ->whereIn('research_id', $researchIds)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'approved' => (int) ($counts['approved'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0),
            'denied' => (int) ($counts['denied'] ?? 0),
        ];
    }

    private function platformUsageActivity(Request $request): array
    {
        $researchIds = $this->researchQuery($request)->pluck('id');
        $months = collect(range(11, 0))
            ->map(fn (int $offset) => now()->startOfMonth()->subMonths($offset));
        $events = ResearchAnalyticsEvent::query()
            ->whereIn('research_id', $researchIds)
            ->whereIn('event_type', ['view', 'download'])
            ->where('occurred_at', '>=', $months->first()->copy()->startOfMonth())
            ->get(['event_type', 'occurred_at'])
            ->groupBy(fn (ResearchAnalyticsEvent $event): string => $event->occurred_at?->format('Y-m') ?? 'N/A');
        $accessRequests = AccessRequest::query()
            ->whereIn('research_id', $researchIds)
            ->where('created_at', '>=', $months->first()->copy()->startOfMonth())
            ->get(['id', 'created_at'])
            ->groupBy(fn (AccessRequest $accessRequest): string => $accessRequest->created_at?->format('Y-m') ?? 'N/A');

        return $months
            ->map(function ($month) use ($events, $accessRequests): array {
                $key = $month->format('Y-m');
                $monthlyEvents = $events->get($key, collect());

                return [
                    'month' => $month->format('M'),
                    'repositoryViews' => $monthlyEvents->where('event_type', 'view')->count(),
                    'downloads' => $monthlyEvents->where('event_type', 'download')->count(),
                    'accessRequests' => $accessRequests->get($key, collect())->count(),
                ];
            })
            ->all();
    }

    private function filterOptions(): array
    {
        return [
            'agencies' => Agency::query()->orderBy('short_name')->pluck('short_name')->filter()->values()->all(),
            'publicationYears' => Research::query()->whereNotNull('publication_year')->distinct()->orderByDesc('publication_year')->pluck('publication_year')->map(fn ($year): string => (string) $year)->all(),
            'researchCategories' => Research::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->all(),
            'sdgs' => $this->sdgFilterOptions(),
            'documentTypes' => ResearchFile::query()
                ->selectRaw("coalesce(nullif(file_type, ''), nullif(extension, ''), nullif(mime_type, '')) as document_type")
                ->distinct()
                ->orderBy('document_type')
                ->pluck('document_type')
                ->filter()
                ->values()
                ->all(),
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
        $agency = $request->query('agency');
        $year = $request->query('publicationYear', $request->query('year'));
        $category = $request->query('researchCategory', $request->query('category'));

        return $query
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $keywords = preg_split('/\s+/', $request->string('search')->trim()->toString()) ?: [];

                foreach ($keywords as $value) {
                    $keyword = '%'.$value.'%';
                    $query->where(function (Builder $query) use ($keyword): void {
                        $query->where('title', 'like', $keyword)
                            ->orWhere('abstract', 'like', $keyword)
                            ->orWhere('authors', 'like', $keyword)
                            ->orWhere('category', 'like', $keyword)
                            ->orWhereHas('agency', fn (Builder $query) => $query->where('short_name', 'like', $keyword)->orWhere('name', 'like', $keyword));
                    });
                }
            })
            ->when($agency !== null && $agency !== '' && $agency !== 'all', function (Builder $query) use ($agency): void {
                if (is_numeric($agency)) {
                    $query->where('agency_id', (int) $agency);

                    return;
                }

                $query->whereHas('agency', fn (Builder $query) => $query->where('short_name', $agency)->orWhere('name', $agency));
            })
            ->when($year !== null && $year !== '' && $year !== 'all', fn (Builder $query) => $query->where('publication_year', (int) $year))
            ->when($category !== null && $category !== '' && $category !== 'all', fn (Builder $query) => $query->where('category', $category))
            ->when($request->filled('sdg'), fn (Builder $query) => $query->whereJsonContains('sdgs', $request->string('sdg')->toString()))
            ->when($request->filled('documentType'), fn (Builder $query) => $this->applyResearchDocumentTypeFilter($query, $request->string('documentType')->toString()))
            ->when($request->filled('accessType'), fn (Builder $query) => $query->where('access_level', $request->string('accessType')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', str_replace('-', '_', $request->string('status')->toString())))
            ->when($request->filled('moderation_status'), function (Builder $query) use ($request): void {
                $statuses = match ($request->string('moderation_status')->toString()) {
                    'pending-review' => ['submitted'],
                    'needs-review' => ['under_review'],
                    'flagged' => ['rejected'],
                    'resolved' => ['approved'],
                    default => [],
                };

                if ($statuses !== []) {
                    $query->whereIn('status', $statuses);
                }
            })
            ->when($request->filled('issue_type'), fn (Builder $query) => $this->applyModerationIssueTypeFilter($query, $request->string('issue_type')->toString()))
            ->when($request->query('date_range') === 'this-year', fn (Builder $query) => $query->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()]))
            ->when($request->query('date_range') === 'last-30-days', fn (Builder $query) => $query->where('created_at', '>=', now()->subDays(30)->startOfDay()))
            ->when($request->query('date_range') === 'last-7-days', fn (Builder $query) => $query->where('created_at', '>=', now()->subDays(7)->startOfDay()))
            ->when($request->query('date_range') === 'this-month', fn (Builder $query) => $query->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]))
            ->when($request->query('date_range') === 'custom', fn (Builder $query) => $query
                ->when($request->date('start_date'), fn (Builder $query, $date) => $query->where('created_at', '>=', $date->startOfDay()))
                ->when($request->date('end_date'), fn (Builder $query, $date) => $query->where('created_at', '<=', $date->endOfDay())));
    }

    private function applyModerationIssueTypeFilter(Builder $query, string $issueType): void
    {
        if ($issueType === 'incomplete_metadata') {
            $query->where(function (Builder $query): void {
                $query->where(function (Builder $query): void {
                    $query->where('status', 'rejected')
                        ->whereHas('latestModerationDecision', fn (Builder $query) => $query->where('issue_type', 'incomplete_metadata'));
                })->orWhere(function (Builder $query): void {
                    $query->where('status', '!=', 'rejected')
                        ->where(function (Builder $query): void {
                            $query->whereNull('abstract')->orWhere('abstract', '')
                                ->orWhereNull('publication_year')
                                ->orWhereNull('category')->orWhere('category', '')
                                ->orWhereNull('authors')->orWhere('authors', '[]')
                                ->orWhereNull('keywords')->orWhere('keywords', '[]');
                        });
                });
            });

            return;
        }

        if ($issueType === 'other_manual_review') {
            $query->where(function (Builder $query): void {
                $query->where(function (Builder $query): void {
                    $query->where('status', 'rejected')
                        ->whereHas('latestModerationDecision', fn (Builder $query) => $query->where('issue_type', 'other_manual_review'));
                })->orWhere(function (Builder $query): void {
                    $query->where('status', '!=', 'rejected')
                        ->whereNotNull('abstract')->where('abstract', '!=', '')
                        ->whereNotNull('publication_year')
                        ->whereNotNull('category')->where('category', '!=', '')
                        ->whereNotNull('authors')->where('authors', '!=', '[]')
                        ->whereNotNull('keywords')->where('keywords', '!=', '[]');
                });
            });

            return;
        }

        $query->where('status', 'rejected')
            ->whereHas('latestModerationDecision', fn (Builder $query) => $query->where('issue_type', $issueType));
    }

    private function applyResearchDocumentTypeFilter(Builder $query, string $documentType): void
    {
        if (in_array($documentType, ['terminal-report', 'project-accomplishment'], true)) {
            $query->where(function (Builder $query) use ($documentType): void {
                $query->whereHas('files', fn (Builder $query) => $query->where('file_type', $documentType)->where('status', '!=', 'deleted')->whereNull('archived_at'))
                    ->orWhere('category', 'like', $documentType === 'terminal-report' ? '%terminal report%' : '%project accomplishment%');
            });

            return;
        }

        if ($documentType === 'research-study') {
            $query->whereDoesntHave('files', fn (Builder $query) => $query->whereIn('file_type', ['terminal-report', 'project-accomplishment'])->where('status', '!=', 'deleted')->whereNull('archived_at'))
                ->where(function (Builder $query): void {
                    $query->whereNull('category')
                        ->orWhere(function (Builder $query): void {
                            $query->where('category', 'not like', '%terminal report%')
                                ->where('category', 'not like', '%project accomplishment%');
                        });
                });

            return;
        }

        $query->whereHas('files', fn (Builder $query) => $query->where('file_type', $documentType)->where('status', '!=', 'deleted')->whereNull('archived_at'));
    }

    private function analyticsEventCount($researchIds, string $eventType): int
    {
        return ResearchAnalyticsEvent::query()
            ->whereIn('research_id', $researchIds)
            ->where('event_type', $eventType)
            ->count();
    }

    private function sdgFilterOptions(): array
    {
        $sdgs = [];

        Research::query()
            ->whereNotNull('sdgs')
            ->select(['id', 'sdgs'])
            ->chunk(200, function ($records) use (&$sdgs): void {
                foreach ($records as $record) {
                    foreach (($record->sdgs ?? []) as $sdg) {
                        $key = is_array($sdg) ? ($sdg['sdg'] ?? $sdg['value'] ?? null) : $sdg;

                        if (is_string($key) && trim($key) !== '') {
                            $sdgs[$key] = ['value' => $key, 'label' => $key];
                        }
                    }
                }
            });

        ksort($sdgs);

        return array_values($sdgs);
    }
}
