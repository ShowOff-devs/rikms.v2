<?php

namespace App\Services\Analytics;

use App\Models\Research;
use App\Support\Statuses;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ProjectReportAnalyticsService
{
    public const REPORT_TYPES = [
        ReportTypeResolver::TERMINAL_REPORT,
        ReportTypeResolver::PROJECT_ACCOMPLISHMENT,
    ];

    public const REPORTING_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'];

    public const COMPLETENESS = ['not_started', 'incomplete', 'complete'];

    public const BUDGET_CLASSIFICATIONS = [
        'not_reported',
        'not_utilized',
        'low',
        'moderate',
        'high',
        'fully_utilized',
        'overutilized',
    ];

    public const ACCOMPLISHMENT_CLASSIFICATIONS = [
        'not_reported',
        'not_started',
        'in_progress',
        'substantially_complete',
        'complete',
    ];

    public const SORTS = [
        'created_at',
        'title',
        'publication_year',
        'workflow_status',
        'reporting_period',
        'project_start_date',
        'project_end_date',
        'allotted_budget',
        'utilized_amount',
    ];

    public function __construct(
        private readonly ReportTypeResolver $reportTypeResolver,
        private readonly ReportCompletenessService $completeness,
        private readonly BudgetUtilizationService $budget,
        private readonly ProjectAccomplishmentService $accomplishment,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function summary(array $filters, ?int $agencyScope = null, bool $allowAgencyFilter = false): array
    {
        $query = $this->filteredQuery($filters, $agencyScope, $allowAgencyFilter);
        $total = (clone $query)->count();
        $financial = $this->financialAggregate($query);
        $classifications = $this->classificationCounts($query);
        $workflow = $this->workflowCounts($query);
        $types = $this->reportTypeCounts($query);

        return [
            'total_reports' => $total,
            'terminal_reports' => $types[ReportTypeResolver::TERMINAL_REPORT] ?? 0,
            'project_accomplishment_reports' => $types[ReportTypeResolver::PROJECT_ACCOMPLISHMENT] ?? 0,
            'complete_reports' => $classifications['completeness']['complete'] ?? 0,
            'incomplete_reports' => $classifications['completeness']['incomplete'] ?? 0,
            'not_started_reports' => $classifications['completeness']['not_started'] ?? 0,
            'submitted_reports' => $workflow[Statuses::RESEARCH_SUBMITTED] ?? 0,
            'approved_reports' => $workflow['approved'] ?? 0,
            'published_reports' => $workflow[Statuses::RESEARCH_PUBLISHED] ?? 0,
            'reports_with_financial_data' => $financial['reports_with_financial_data'],
            'reports_without_financial_data' => $financial['reports_without_financial_data'],
            'total_allotted_budget' => $financial['allotted_budget'],
            'total_released_amount' => $financial['released_amount'],
            'total_obligated_amount' => $financial['obligated_amount'],
            'total_utilized_amount' => $financial['utilized_amount'],
            'total_remaining_balance' => $financial['remaining_balance'],
            'overall_utilization_percentage' => $financial['utilization_percentage'],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function status(array $filters, ?int $agencyScope = null, bool $allowAgencyFilter = false): array
    {
        $query = $this->filteredQuery($filters, $agencyScope, $allowAgencyFilter);
        $total = (clone $query)->count();
        $classifications = $this->classificationCounts($query);

        return [
            'report_type' => $this->distribution($this->reportTypeCounts($query), self::REPORT_TYPES, $total),
            'workflow_status' => $this->distribution($this->workflowCounts($query), Statuses::RESEARCH, $total),
            'completeness' => $this->distribution($classifications['completeness'], self::COMPLETENESS, $total),
            'accomplishment' => $this->distribution($classifications['accomplishment'], self::ACCOMPLISHMENT_CLASSIFICATIONS, $total),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function budget(array $filters, ?int $agencyScope = null, bool $allowAgencyFilter = false, bool $includeAgencyGroups = false): array
    {
        $query = $this->filteredQuery($filters, $agencyScope, $allowAgencyFilter);

        $payload = [
            'totals' => $this->financialAggregate($query),
            'classification_distribution' => $this->distribution(
                $this->classificationCounts($query)['budget'],
                self::BUDGET_CLASSIFICATIONS,
                (clone $query)->count(),
            ),
            'by_report_type' => array_values($this->groupedFinancials($query, fn (Research $research): string => $this->reportTypeResolver->resolve($research))),
            'by_reporting_period' => array_values($this->groupedFinancials($query, fn (Research $research): string => $research->reportDetail?->reporting_period ?? 'Not reported')),
        ];

        if ($includeAgencyGroups) {
            $payload['by_agency'] = array_values($this->groupedFinancials(
                $query,
                fn (Research $research): string => (string) $research->agency_id,
                fn (Research $research): array => [
                    'agency_id' => $research->agency_id,
                    'agency_name' => $research->agency?->name,
                    'agency_short_name' => $research->agency?->short_name,
                ],
            ));
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function agencyComparison(array $filters): array
    {
        $query = $this->filteredQuery($filters, null, true);
        $groups = $this->groupedFinancials(
            $query,
            fn (Research $research): string => (string) $research->agency_id,
            fn (Research $research): array => [
                'agency_id' => $research->agency_id,
                'agency_name' => $research->agency?->name,
                'agency_short_name' => $research->agency?->short_name,
            ],
        );

        $this->chunkReports($query, function (Research $research) use (&$groups): void {
            $key = (string) $research->agency_id;
            $groups[$key] ??= $this->emptyFinancialGroup([
                'agency_id' => $research->agency_id,
                'agency_name' => $research->agency?->name,
                'agency_short_name' => $research->agency?->short_name,
            ]);
            $classification = $this->completeness->calculate($research)['classification'];

            if ($classification === 'complete') {
                $groups[$key]['complete_count'] = ($groups[$key]['complete_count'] ?? 0) + 1;
            } elseif (in_array($classification, ['incomplete', 'not_started'], true)) {
                $groups[$key]['incomplete_count'] = ($groups[$key]['incomplete_count'] ?? 0) + 1;
            }
        });

        return collect($groups)
            ->sortBy('agency_name')
            ->values()
            ->map(fn (array $group): array => [
                'agency_id' => $group['agency_id'],
                'agency_name' => $group['agency_name'],
                'agency_short_name' => $group['agency_short_name'],
                'report_count' => $group['report_count'],
                'complete_count' => $group['complete_count'] ?? 0,
                'incomplete_count' => $group['incomplete_count'] ?? 0,
                'allotted_budget' => $group['allotted_budget'],
                'utilized_amount' => $group['utilized_amount'],
                'remaining_balance' => $group['remaining_balance'],
                'utilization_percentage' => $group['utilization_percentage'],
                'reports_without_financial_data' => $group['reports_without_financial_data'],
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function records(array $filters, ?int $agencyScope = null, bool $allowAgencyFilter = false): LengthAwarePaginator
    {
        $query = $this->filteredQuery($filters, $agencyScope, $allowAgencyFilter);
        $this->applySorting($query, $filters);

        return $this->withAnalyticsRelations($query)
            ->paginate((int) ($filters['per_page'] ?? 15));
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function exportRecords(array $filters, ?int $agencyScope = null, bool $allowAgencyFilter = false): Collection
    {
        $query = $this->filteredQuery($filters, $agencyScope, $allowAgencyFilter);
        $this->applySorting($query, $filters);

        return $this->withAnalyticsRelations($query)->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function filteredQuery(array $filters, ?int $agencyScope = null, bool $allowAgencyFilter = false): Builder
    {
        $query = $this->baseQuery($filters, $agencyScope, $allowAgencyFilter);

        if ($this->hasServiceClassificationFilters($filters)) {
            $ids = $this->matchingClassificationIds($query, $filters);

            $query->whereIn('research.id', $ids ?: [0]);
        }

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function baseQuery(array $filters, ?int $agencyScope, bool $allowAgencyFilter): Builder
    {
        $query = Research::query()
            ->whereNull('archived_at')
            ->where('status', '!=', Statuses::RESEARCH_ARCHIVED)
            ->where('status', '!=', Statuses::RESEARCH_SUPERSEDED)
            ->where(function (Builder $query): void {
                $query
                    ->where('category', 'like', '%Terminal Report%')
                    ->orWhere('category', 'like', '%Project Accomplishment%')
                    ->orWhereHas('files', fn (Builder $query) => $query->whereIn('file_type', self::REPORT_TYPES));
            });

        if ($agencyScope !== null) {
            $query->where('agency_id', $agencyScope);
        } elseif ($allowAgencyFilter && filled($filters['agency_id'] ?? null)) {
            $query->where('agency_id', (int) $filters['agency_id']);
        }

        if (filled($filters['report_type'] ?? null)) {
            $this->applyReportType($query, (string) $filters['report_type']);
        }

        return $query
            ->when(filled($filters['publication_year'] ?? null), fn (Builder $query) => $query->where('publication_year', (int) $filters['publication_year']))
            ->when(filled($filters['workflow_status'] ?? null), fn (Builder $query) => $query->where('status', $filters['workflow_status']))
            ->when(filled($filters['reporting_period'] ?? null), fn (Builder $query) => $query->whereHas('reportDetail', fn (Builder $query) => $query->where('reporting_period', $filters['reporting_period'])))
            ->when(filled($filters['funding_source'] ?? null), fn (Builder $query) => $query->where('public_metadata->funding_source', $filters['funding_source']))
            ->when(filled($filters['date_from'] ?? null), fn (Builder $query) => $query->whereDate('created_at', '>=', $filters['date_from']))
            ->when(filled($filters['date_to'] ?? null), fn (Builder $query) => $query->whereDate('created_at', '<=', $filters['date_to']));
    }

    private function applyReportType(Builder $query, string $reportType): void
    {
        if ($reportType === ReportTypeResolver::TERMINAL_REPORT) {
            $query->where(function (Builder $query): void {
                $query
                    ->where('category', 'like', '%Terminal Report%')
                    ->orWhere(function (Builder $query): void {
                        $query
                            ->where(function (Builder $query): void {
                                $query->whereNull('category')->orWhere('category', 'not like', '%Project Accomplishment%');
                            })
                            ->whereHas('files', fn (Builder $query) => $query->where('file_type', ReportTypeResolver::TERMINAL_REPORT));
                    });
            });

            return;
        }

        $query->where(function (Builder $query): void {
            $query
                ->where('category', 'like', '%Project Accomplishment%')
                ->orWhere(function (Builder $query): void {
                    $query
                        ->where(function (Builder $query): void {
                            $query->whereNull('category')->orWhere('category', 'not like', '%Terminal Report%');
                        })
                        ->whereHas('files', fn (Builder $query) => $query->where('file_type', ReportTypeResolver::PROJECT_ACCOMPLISHMENT));
                });
        });
    }

    private function withAnalyticsRelations(Builder $query): Builder
    {
        return $query
            ->select('research.*')
            ->with([
                'agency:id,name,short_name',
                'reportDetail',
                'performanceItems',
                'files:id,research_id,file_type',
            ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applySorting(Builder $query, array $filters): void
    {
        $sort = (string) ($filters['sort'] ?? 'created_at');
        $direction = (string) ($filters['direction'] ?? 'desc');

        if (in_array($sort, ['reporting_period', 'project_start_date', 'project_end_date', 'allotted_budget', 'utilized_amount'], true)) {
            $query
                ->leftJoin('research_report_details as analytics_sort_details', 'analytics_sort_details.research_id', '=', 'research.id')
                ->orderBy('analytics_sort_details.'.$sort, $direction)
                ->orderBy('research.id', 'asc');

            return;
        }

        $column = $sort === 'workflow_status' ? 'status' : $sort;

        $query->orderBy('research.'.$column, $direction)->orderBy('research.id', 'asc');
    }

    /**
     * @return array<string, int>
     */
    private function workflowCounts(Builder $query): array
    {
        return (clone $query)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn (mixed $count): int => (int) $count)
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function reportTypeCounts(Builder $query): array
    {
        $counts = array_fill_keys(self::REPORT_TYPES, 0);

        $this->chunkReports($query, function (Research $research) use (&$counts): void {
            $type = $this->reportTypeResolver->resolve($research);

            if (isset($counts[$type])) {
                $counts[$type]++;
            }
        });

        return $counts;
    }

    /**
     * @return array{completeness: array<string, int>, budget: array<string, int>, accomplishment: array<string, int>}
     */
    private function classificationCounts(Builder $query): array
    {
        $counts = [
            'completeness' => array_fill_keys(self::COMPLETENESS, 0),
            'budget' => array_fill_keys(self::BUDGET_CLASSIFICATIONS, 0),
            'accomplishment' => array_fill_keys(self::ACCOMPLISHMENT_CLASSIFICATIONS, 0),
        ];

        $this->chunkReports($query, function (Research $research) use (&$counts): void {
            $completeness = $this->completeness->calculate($research)['classification'];
            $budget = $this->budget->calculate($research)['classification'];
            $accomplishment = $this->accomplishment->calculate($research)['classification'];

            if (isset($counts['completeness'][$completeness])) {
                $counts['completeness'][$completeness]++;
            }

            if (isset($counts['budget'][$budget])) {
                $counts['budget'][$budget]++;
            }

            if (isset($counts['accomplishment'][$accomplishment])) {
                $counts['accomplishment'][$accomplishment]++;
            }
        });

        return $counts;
    }

    /**
     * @return array<string, mixed>
     */
    private function financialAggregate(Builder $query): array
    {
        $group = $this->emptyFinancialGroup();

        $this->chunkReports($query, function (Research $research) use (&$group): void {
            $this->addFinancialReport($group, $research);
        });

        return $this->finalizeFinancialGroup($group);
    }

    /**
     * @param  callable(Research): string  $keyResolver
     * @param  null|callable(Research): array<string, mixed>  $metaResolver
     * @return array<string, array<string, mixed>>
     */
    private function groupedFinancials(Builder $query, callable $keyResolver, ?callable $metaResolver = null): array
    {
        $groups = [];

        $this->chunkReports($query, function (Research $research) use (&$groups, $keyResolver, $metaResolver): void {
            $key = $keyResolver($research);
            $groups[$key] ??= $this->emptyFinancialGroup(array_merge(['key' => $key], $metaResolver ? $metaResolver($research) : []));

            $this->addFinancialReport($groups[$key], $research);
        });

        return collect($groups)
            ->map(fn (array $group): array => $this->finalizeFinancialGroup($group))
            ->all();
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private function emptyFinancialGroup(array $meta = []): array
    {
        return array_merge($meta, [
            'report_count' => 0,
            'reports_with_financial_data' => 0,
            'reports_without_financial_data' => 0,
            'allotted_budget' => '0.00',
            'released_amount' => '0.00',
            'obligated_amount' => '0.00',
            'utilized_amount' => '0.00',
        ]);
    }

    /**
     * @param  array<string, mixed>  $group
     */
    private function addFinancialReport(array &$group, Research $research): void
    {
        $detail = $research->reportDetail;
        $group['report_count']++;

        if (! $detail || ! $this->hasAnyFinancialData($detail)) {
            $group['reports_without_financial_data']++;

            return;
        }

        $group['reports_with_financial_data']++;

        foreach (['allotted_budget', 'released_amount', 'obligated_amount', 'utilized_amount'] as $field) {
            if (Decimal::isReported($detail->{$field})) {
                $group[$field] = Decimal::add($group[$field], $detail->{$field});
            }
        }
    }

    /**
     * @param  array<string, mixed>  $group
     * @return array<string, mixed>
     */
    private function finalizeFinancialGroup(array $group): array
    {
        $group['remaining_balance'] = Decimal::subtract($group['allotted_budget'], $group['utilized_amount']) ?? '0.00';
        $group['utilization_percentage'] = Decimal::percentage($group['utilized_amount'], $group['allotted_budget']);

        return $group;
    }

    private function hasAnyFinancialData(mixed $detail): bool
    {
        return collect([
            $detail->allotted_budget,
            $detail->released_amount,
            $detail->obligated_amount,
            $detail->utilized_amount,
            $detail->financial_as_of_date,
        ])->contains(fn (mixed $value): bool => Decimal::isReported($value));
    }

    /**
     * @param  array<string, int>  $counts
     * @param  array<int, string>  $keys
     * @return array<int, array{key: string, count: int, percentage: float|null}>
     */
    private function distribution(array $counts, array $keys, int $total): array
    {
        return collect($keys)
            ->map(fn (string $key): array => [
                'key' => $key,
                'count' => (int) ($counts[$key] ?? 0),
                'percentage' => $total > 0 ? round(((int) ($counts[$key] ?? 0) / $total) * 100, 2) : null,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  callable(Research): void  $callback
     */
    private function chunkReports(Builder $query, callable $callback): void
    {
        $this->withAnalyticsRelations((clone $query)->reorder('research.id'))
            ->chunkById(100, function (Collection $reports) use ($callback): void {
                $reports->each($callback);
            }, 'research.id', 'id');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<int>
     */
    private function matchingClassificationIds(Builder $query, array $filters): array
    {
        $ids = [];

        $this->chunkReports($query, function (Research $research) use (&$ids, $filters): void {
            if (filled($filters['completeness'] ?? null)
                && $this->completeness->calculate($research)['classification'] !== $filters['completeness']) {
                return;
            }

            if (filled($filters['budget_classification'] ?? null)
                && $this->budget->calculate($research)['classification'] !== $filters['budget_classification']) {
                return;
            }

            if (filled($filters['accomplishment_classification'] ?? null)
                && $this->accomplishment->calculate($research)['classification'] !== $filters['accomplishment_classification']) {
                return;
            }

            $ids[] = (int) $research->id;
        });

        return $ids;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function hasServiceClassificationFilters(array $filters): bool
    {
        return filled($filters['completeness'] ?? null)
            || filled($filters['budget_classification'] ?? null)
            || filled($filters['accomplishment_classification'] ?? null);
    }
}
