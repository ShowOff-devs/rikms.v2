import {
    AlertTriangle,
    BarChart3,
    Building2,
    ClipboardCheck,
    Download,
    FileCheck2,
    FileText,
    FolderOpen,
    Landmark,
    ListFilter,
    PieChart,
    RotateCcw,
    WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getAdminProjectReportAgencies,
    getAdminProjectReportBudgetAnalytics,
    getAdminProjectReportRecords,
    getAdminProjectReportStatusAnalytics,
    getAdminProjectReportSummary,
    exportAdminProjectReportAnalytics,
} from '@/lib/analytics/project-report-analytics-service';
import type {
    AccomplishmentClassification,
    ApiPagination,
    BudgetClassification,
    ProjectReportAgencyComparison,
    ProjectReportAnalyticsFilters,
    ProjectReportAnalyticsRecord,
    ProjectReportBudgetAnalytics,
    ProjectReportDistributionItem,
    ProjectReportStatusAnalytics,
    ProjectReportSummary,
    ProjectReportWorkflowStatus,
    ReportCompletenessClassification,
} from '@/types/project-report-analytics';

const allValue = 'all';
const recordsPerPage = 10;

const reportTypeOptions = [
    { value: 'terminal-report', label: 'Terminal Report' },
    { value: 'project-accomplishment', label: 'Project Accomplishment Report' },
] as const;

const reportingPeriodOptions = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'];

const workflowStatusOptions: ProjectReportWorkflowStatus[] = [
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'published',
    'archived',
    'superseded',
];

const completenessOptions: ReportCompletenessClassification[] = [
    'not_started',
    'incomplete',
    'complete',
];

const budgetOptions: BudgetClassification[] = [
    'not_reported',
    'not_utilized',
    'low',
    'moderate',
    'high',
    'fully_utilized',
    'overutilized',
];

const accomplishmentOptions: AccomplishmentClassification[] = [
    'not_reported',
    'not_started',
    'in_progress',
    'substantially_complete',
    'complete',
];

const agencySortOptions = [
    { value: 'report_count', label: 'Report count' },
    { value: 'allotted_budget', label: 'Allotted budget' },
    { value: 'utilized_amount', label: 'Utilized amount' },
    { value: 'utilization_percentage', label: 'Utilization percentage' },
    { value: 'complete_count', label: 'Complete reports' },
    { value: 'incomplete_count', label: 'Incomplete reports' },
] as const;

type AgencySort = (typeof agencySortOptions)[number]['value'];

const initialFilters: ProjectReportAnalyticsFilters = {
    agency_id: allValue,
    report_type: allValue,
    publication_year: '',
    reporting_period: allValue,
    workflow_status: allValue,
    completeness: allValue,
    budget_classification: allValue,
    accomplishment_classification: allValue,
    funding_source: '',
    date_from: '',
    date_to: '',
};

type AggregateState = {
    summary: ProjectReportSummary;
    status: ProjectReportStatusAnalytics;
    budget: ProjectReportBudgetAnalytics;
    agencies: ProjectReportAgencyComparison[];
};

type RecordsState = {
    records: ProjectReportAnalyticsRecord[];
    pagination: ApiPagination;
};

export function AdminProjectReportAnalyticsSection() {
    const [filters, setFilters] =
        useState<ProjectReportAnalyticsFilters>(initialFilters);
    const [publicationYearDraft, setPublicationYearDraft] = useState('');
    const [fundingSourceDraft, setFundingSourceDraft] = useState('');
    const [page, setPage] = useState(1);
    const [aggregate, setAggregate] = useState<AggregateState | null>(null);
    const [recordsState, setRecordsState] = useState<RecordsState | null>(null);
    const [isAggregateLoading, setIsAggregateLoading] = useState(true);
    const [isRecordsLoading, setIsRecordsLoading] = useState(true);
    const [aggregateError, setAggregateError] = useState('');
    const [recordsError, setRecordsError] = useState('');
    const [reloadToken, setReloadToken] = useState(0);
    const [recordsReloadToken, setRecordsReloadToken] = useState(0);
    const [agencySort, setAgencySort] = useState<AgencySort>('report_count');
    const [agencyFilterOptions, setAgencyFilterOptions] = useState<
        ProjectReportAgencyComparison[]
    >([]);
    const [exportingFormat, setExportingFormat] = useState<
        'pdf' | 'csv' | null
    >(null);
    const [exportMessage, setExportMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        getAdminProjectReportAgencies({}, controller.signal)
            .then((agencies) => {
                if (isCurrent) {
                    setAgencyFilterOptions(agencies);
                }
            })
            .catch((error: unknown) => {
                if (isCurrent && !isAbortError(error)) {
                    setAgencyFilterOptions([]);
                }
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setFilters((current) => {
                if (
                    (current.funding_source ?? '') === fundingSourceDraft &&
                    (current.publication_year ?? '') === publicationYearDraft
                ) {
                    return current;
                }

                setIsAggregateLoading(true);
                setIsRecordsLoading(true);
                setAggregateError('');
                setRecordsError('');
                setPage(1);

                return {
                    ...current,
                    publication_year: publicationYearDraft,
                    funding_source: fundingSourceDraft,
                };
            });
        }, 450);

        return () => window.clearTimeout(timeout);
    }, [fundingSourceDraft, publicationYearDraft]);

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        Promise.all([
            getAdminProjectReportSummary(filters, controller.signal),
            getAdminProjectReportStatusAnalytics(filters, controller.signal),
            getAdminProjectReportBudgetAnalytics(filters, controller.signal),
            getAdminProjectReportAgencies(filters, controller.signal),
        ])
            .then(([summary, status, budget, agencies]) => {
                if (!isCurrent) {
                    return;
                }

                setAggregate({ summary, status, budget, agencies });
                setAggregateError('');
                setIsAggregateLoading(false);
            })
            .catch((error: unknown) => {
                if (!isCurrent || isAbortError(error)) {
                    return;
                }

                setAggregateError(
                    'Project report analytics could not be loaded. Please refresh the page or try again.',
                );
                setIsAggregateLoading(false);
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [filters, reloadToken]);

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        getAdminProjectReportRecords(
            filters,
            { page, perPage: recordsPerPage },
            controller.signal,
        )
            .then((payload) => {
                if (!isCurrent) {
                    return;
                }

                setRecordsState({
                    records: payload.data,
                    pagination: payload.pagination,
                });
                setRecordsError('');
                setIsRecordsLoading(false);
            })
            .catch((error: unknown) => {
                if (!isCurrent || isAbortError(error)) {
                    return;
                }

                setRecordsError(
                    'Project report analytics could not be loaded. Please refresh the page or try again.',
                );
                setIsRecordsLoading(false);
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [filters, page, recordsReloadToken]);

    const activeFilterCount = useMemo(
        () =>
            Object.values(filters).filter(
                (value) => value && value !== allValue,
            ).length,
        [filters],
    );

    const agencyOptions = useMemo(
        () =>
            (agencyFilterOptions.length > 0
                ? agencyFilterOptions
                : (aggregate?.agencies ?? [])
            )
                .filter((agency) => agency.agency_id !== null)
                .map((agency) => ({
                    id: String(agency.agency_id),
                    label: agency.agency_short_name ?? agency.agency_name ?? '',
                    name: agency.agency_name ?? agency.agency_short_name ?? '',
                })),
        [agencyFilterOptions, aggregate?.agencies],
    );

    const sortedAgencies = useMemo(() => {
        return [...(aggregate?.agencies ?? [])].sort((left, right) => {
            const leftValue = agencySortNumber(left, agencySort);
            const rightValue = agencySortNumber(right, agencySort);

            if (leftValue === rightValue) {
                return (left.agency_name ?? '').localeCompare(
                    right.agency_name ?? '',
                );
            }

            return rightValue - leftValue;
        });
    }, [agencySort, aggregate?.agencies]);

    const hasReports = (aggregate?.summary.total_reports ?? 0) > 0;

    const updateFilter = (
        key: keyof ProjectReportAnalyticsFilters,
        value: string,
    ) => {
        setIsAggregateLoading(true);
        setIsRecordsLoading(true);
        setAggregateError('');
        setRecordsError('');
        setPage(1);
        setFilters((current) => {
            const next = { ...current, [key]: value };

            if (
                key === 'date_from' &&
                value &&
                current.date_to &&
                current.date_to < value
            ) {
                next.date_to = '';
            }

            if (
                key === 'date_to' &&
                value &&
                current.date_from &&
                value < current.date_from
            ) {
                next.date_from = '';
            }

            return next;
        });
    };

    const clearFilters = () => {
        setIsAggregateLoading(true);
        setIsRecordsLoading(true);
        setAggregateError('');
        setRecordsError('');
        setFilters(initialFilters);
        setPublicationYearDraft('');
        setFundingSourceDraft('');
        setPage(1);
    };

    const retryAggregate = () => {
        setIsAggregateLoading(true);
        setAggregateError('');
        setReloadToken((current) => current + 1);
    };

    const retryRecords = () => {
        setIsRecordsLoading(true);
        setRecordsError('');
        setRecordsReloadToken((current) => current + 1);
    };

    const changePage = (nextPage: number) => {
        setIsRecordsLoading(true);
        setRecordsError('');
        setPage(nextPage);
    };

    const exportReport = async (format: 'pdf' | 'csv') => {
        setExportingFormat(format);
        setExportMessage('');

        try {
            const result = await exportAdminProjectReportAnalytics(
                filters,
                format,
            );
            setExportMessage(`${result.fileName} is ready.`);
        } catch {
            setExportMessage(
                'Project report analytics could not be exported. Please try again.',
            );
        } finally {
            setExportingFormat(null);
        }
    };

    return (
        <section
            className="space-y-5"
            aria-labelledby="admin-project-report-heading"
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-[#6a7282]">
                        <span>Super Admin</span>
                        <span className="text-[#99a1af]">/</span>
                        <span className="text-[#1e3a8a]">
                            Terminal and Accomplishment Reports
                        </span>
                    </div>
                    <h2
                        id="admin-project-report-heading"
                        className="mt-2 text-[22px] leading-8 font-bold text-[#1e3a8a]"
                    >
                        Project Report Analytics
                    </h2>
                    <p className="mt-1 max-w-[780px] text-sm leading-5 text-[#6a7282]">
                        Regional read-only metrics for Terminal Reports and
                        Project Accomplishment Reports across agencies.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => exportReport('pdf')}
                        disabled={exportingFormat !== null}
                        className="bg-[#1e3a8a] text-white hover:bg-[#172554]"
                    >
                        <Download className="size-4" aria-hidden="true" />
                        {exportingFormat === 'pdf'
                            ? 'Exporting PDF...'
                            : 'Export PDF'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => exportReport('csv')}
                        disabled={exportingFormat !== null}
                    >
                        <Download className="size-4" aria-hidden="true" />
                        {exportingFormat === 'csv'
                            ? 'Exporting CSV...'
                            : 'Export CSV'}
                    </Button>
                </div>
            </div>

            {exportMessage ? (
                <p className="text-sm text-[#4a5565]" role="status">
                    {exportMessage}
                </p>
            ) : null}

            <ProjectReportFilters
                filters={filters}
                agencyOptions={agencyOptions}
                publicationYearDraft={publicationYearDraft}
                fundingSourceDraft={fundingSourceDraft}
                activeFilterCount={activeFilterCount}
                onFilterChange={updateFilter}
                onPublicationYearChange={(value) =>
                    setPublicationYearDraft(value)
                }
                onFundingSourceChange={(value) => setFundingSourceDraft(value)}
                onClearFilters={clearFilters}
            />

            {isAggregateLoading ? <ProjectReportLoadingState /> : null}

            {!isAggregateLoading && aggregateError ? (
                <ProjectReportErrorState
                    message={aggregateError}
                    onRetry={retryAggregate}
                />
            ) : null}

            {!isAggregateLoading &&
            !aggregateError &&
            aggregate &&
            !hasReports ? (
                <ProjectReportEmptyState
                    filtered={activeFilterCount > 0}
                    onClearFilters={clearFilters}
                />
            ) : null}

            {!isAggregateLoading &&
            !aggregateError &&
            aggregate &&
            hasReports ? (
                <>
                    <ProjectReportSummaryCards summary={aggregate.summary} />

                    <section className="grid gap-5 xl:grid-cols-2">
                        <DistributionChart
                            title="Report Completeness"
                            description="Not Started, Incomplete, and Complete report records."
                            data={aggregate.status.completeness}
                            labels={completenessLabels}
                            emptyMessage="No Terminal Reports or Project Accomplishment Reports are available for the selected filters."
                            tone="blue"
                        />
                        <DistributionChart
                            title="Workflow Status"
                            description="Actual workflow statuses returned by the analytics API."
                            data={aggregate.status.workflow_status.filter(
                                (item) => item.count > 0,
                            )}
                            labels={workflowStatusLabels}
                            emptyMessage="No workflow status data is available for the selected filters."
                            tone="green"
                        />
                    </section>

                    <section className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
                        <DistributionChart
                            title="Physical Accomplishment"
                            description="Backend accomplishment classifications for matching reports."
                            data={aggregate.status.accomplishment}
                            labels={accomplishmentLabels}
                            emptyMessage="No accomplishment data is available for the selected filters."
                            tone="violet"
                        />
                        <RegionalBudgetPanel budget={aggregate.budget} />
                    </section>

                    <section className="grid gap-5 xl:grid-cols-2">
                        <AgencyBudgetComparisonChart
                            agencies={sortedAgencies}
                        />
                        <AgencyUtilizationChart agencies={sortedAgencies} />
                    </section>

                    <AgencyComparisonTable
                        agencies={sortedAgencies}
                        sort={agencySort}
                        onSortChange={setAgencySort}
                    />
                </>
            ) : null}

            <ProjectReportRecordsTable
                isLoading={isRecordsLoading}
                error={recordsError}
                records={recordsState?.records ?? []}
                pagination={recordsState?.pagination ?? null}
                onRetry={retryRecords}
                onPageChange={changePage}
            />
        </section>
    );
}

function ProjectReportFilters({
    filters,
    agencyOptions,
    publicationYearDraft,
    fundingSourceDraft,
    activeFilterCount,
    onFilterChange,
    onPublicationYearChange,
    onFundingSourceChange,
    onClearFilters,
}: {
    filters: ProjectReportAnalyticsFilters;
    agencyOptions: { id: string; label: string; name: string }[];
    publicationYearDraft: string;
    fundingSourceDraft: string;
    activeFilterCount: number;
    onFilterChange: (
        key: keyof ProjectReportAnalyticsFilters,
        value: string,
    ) => void;
    onPublicationYearChange: (value: string) => void;
    onFundingSourceChange: (value: string) => void;
    onClearFilters: () => void;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label htmlFor="agency_id" className="min-w-0">
                    <span className="mb-1.5 block text-xs font-medium text-[#4a5565]">
                        Agency
                    </span>
                    <Select
                        value={filters.agency_id ?? allValue}
                        onValueChange={(value) =>
                            onFilterChange('agency_id', value)
                        }
                    >
                        <SelectTrigger
                            id="agency_id"
                            className="h-10 w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#1e2939] shadow-none"
                        >
                            <SelectValue placeholder="All agencies" />
                        </SelectTrigger>
                        <SelectContent className="border-[#e5e7eb] bg-white">
                            <SelectItem value={allValue}>
                                All agencies
                            </SelectItem>
                            {agencyOptions.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
                                    {agency.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <FilterSelect
                    id="report_type"
                    label="Report Type"
                    placeholder="All report types"
                    value={filters.report_type ?? allValue}
                    options={reportTypeOptions.map((option) => option.value)}
                    format={(value) =>
                        reportTypeOptions.find(
                            (option) => option.value === value,
                        )?.label ?? value
                    }
                    onChange={(value) => onFilterChange('report_type', value)}
                />
                <FilterInput
                    id="publication_year"
                    label="Publication Year"
                    type="number"
                    min="1900"
                    max="2100"
                    value={publicationYearDraft}
                    onChange={onPublicationYearChange}
                />
                <FilterSelect
                    id="reporting_period"
                    label="Reporting Period"
                    placeholder="All periods"
                    value={filters.reporting_period ?? allValue}
                    options={reportingPeriodOptions}
                    onChange={(value) =>
                        onFilterChange('reporting_period', value)
                    }
                />
                <FilterSelect
                    id="workflow_status"
                    label="Workflow Status"
                    placeholder="All statuses"
                    value={filters.workflow_status ?? allValue}
                    options={workflowStatusOptions}
                    format={formatLabel}
                    onChange={(value) =>
                        onFilterChange('workflow_status', value)
                    }
                />
                <FilterSelect
                    id="completeness"
                    label="Completeness"
                    placeholder="All completeness"
                    value={filters.completeness ?? allValue}
                    options={completenessOptions}
                    format={formatLabel}
                    onChange={(value) => onFilterChange('completeness', value)}
                />
                <FilterSelect
                    id="budget_classification"
                    label="Budget Classification"
                    placeholder="All budget classes"
                    value={filters.budget_classification ?? allValue}
                    options={budgetOptions}
                    format={formatLabel}
                    onChange={(value) =>
                        onFilterChange('budget_classification', value)
                    }
                />
                <FilterSelect
                    id="accomplishment_classification"
                    label="Accomplishment"
                    placeholder="All accomplishment"
                    value={filters.accomplishment_classification ?? allValue}
                    options={accomplishmentOptions}
                    format={formatLabel}
                    onChange={(value) =>
                        onFilterChange('accomplishment_classification', value)
                    }
                />
                <FilterInput
                    id="funding_source"
                    label="Funding Source"
                    value={fundingSourceDraft}
                    onChange={onFundingSourceChange}
                />
                <FilterInput
                    id="date_from"
                    label="Date From"
                    type="date"
                    value={filters.date_from ?? ''}
                    onChange={(value) => onFilterChange('date_from', value)}
                />
                <FilterInput
                    id="date_to"
                    label="Date To"
                    type="date"
                    value={filters.date_to ?? ''}
                    onChange={(value) => onFilterChange('date_to', value)}
                />
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-[#f3f4f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="inline-flex items-center gap-2 text-xs leading-4 text-[#6a7282]">
                    <ListFilter className="size-3.5" />
                    {activeFilterCount === 0
                        ? 'Showing regional project report analytics'
                        : `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}
                </p>
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex h-9 w-fit items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb]"
                >
                    <RotateCcw className="size-4" />
                    Reset filters
                </button>
            </div>
        </section>
    );
}

function FilterSelect({
    id,
    label,
    value,
    placeholder,
    options,
    format = (option) => option,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    options: readonly string[];
    format?: (value: string) => string;
    onChange: (value: string) => void;
}) {
    return (
        <label htmlFor={id} className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5565]">
                {label}
            </span>
            <Select value={value || allValue} onValueChange={onChange}>
                <SelectTrigger
                    id={id}
                    className="h-10 w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#1e2939] shadow-none"
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="border-[#e5e7eb] bg-white">
                    <SelectItem value={allValue}>{placeholder}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {format(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </label>
    );
}

function FilterInput({
    id,
    label,
    value,
    onChange,
    type = 'text',
    min,
    max,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'number' | 'date';
    min?: string;
    max?: string;
}) {
    return (
        <label htmlFor={id} className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5565]">
                {label}
            </span>
            <Input
                id={id}
                type={type}
                value={value}
                min={min}
                max={max}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#1e2939] shadow-none"
            />
        </label>
    );
}

function ProjectReportSummaryCards({
    summary,
}: {
    summary: ProjectReportSummary;
}) {
    const cards = [
        [
            'total',
            'Total Reports',
            formatNumber(summary.total_reports),
            FileText,
            'bg-[#eff6ff] text-[#1e3a8a]',
        ],
        [
            'terminal',
            'Terminal Reports',
            formatNumber(summary.terminal_reports),
            FileCheck2,
            'bg-[#ecfdf5] text-[#009966]',
        ],
        [
            'par',
            'Project Accomplishment Reports',
            formatNumber(summary.project_accomplishment_reports),
            ClipboardCheck,
            'bg-[#fff7ed] text-[#f97316]',
        ],
        [
            'complete',
            'Complete Reports',
            formatNumber(summary.complete_reports),
            PieChart,
            'bg-[#f5f3ff] text-[#7c3aed]',
        ],
        [
            'incomplete',
            'Incomplete Reports',
            formatNumber(summary.incomplete_reports),
            AlertTriangle,
            'bg-[#fef2f2] text-[#e7000b]',
        ],
        [
            'with-financial',
            'Reports with Financial Data',
            formatNumber(summary.reports_with_financial_data),
            WalletCards,
            'bg-[#f0fdfa] text-[#0f766e]',
        ],
        [
            'without-financial',
            'Reports without Financial Data',
            formatNumber(summary.reports_without_financial_data),
            FileText,
            'bg-[#f8fafc] text-[#64748b]',
        ],
        [
            'allotted',
            'Total Regional Allotted Budget',
            formatCurrency(summary.total_allotted_budget),
            Landmark,
            'bg-[#eff6ff] text-[#1e3a8a]',
        ],
        [
            'released',
            'Total Regional Released Amount',
            formatCurrency(summary.total_released_amount),
            WalletCards,
            'bg-[#ecfdf5] text-[#009966]',
        ],
        [
            'obligated',
            'Total Regional Obligated Amount',
            formatCurrency(summary.total_obligated_amount),
            ClipboardCheck,
            'bg-[#fff7ed] text-[#f97316]',
        ],
        [
            'utilized',
            'Total Regional Utilized Amount',
            formatCurrency(summary.total_utilized_amount),
            BarChart3,
            'bg-[#f5f3ff] text-[#7c3aed]',
        ],
        [
            'balance',
            'Regional Remaining Balance',
            formatCurrency(summary.total_remaining_balance),
            Landmark,
            'bg-[#f8fafc] text-[#475569]',
        ],
        [
            'utilization',
            'Overall Regional Budget Utilization',
            formatPercentage(summary.overall_utilization_percentage),
            PieChart,
            'bg-[#f0fdfa] text-[#0f766e]',
        ],
    ] as const;

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([id, label, value, Icon, tone]) => (
                <article
                    key={id}
                    className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs leading-4 font-medium text-[#6a7282]">
                                {label}
                            </p>
                            <p className="mt-2 text-[22px] leading-8 font-bold break-words text-[#1e2939]">
                                {value}
                            </p>
                        </div>
                        <span
                            className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] ${tone}`}
                        >
                            <Icon className="size-5" />
                        </span>
                    </div>
                </article>
            ))}
        </section>
    );
}

function DistributionChart({
    title,
    description,
    data,
    labels,
    emptyMessage,
    tone,
}: {
    title: string;
    description: string;
    data: ProjectReportDistributionItem[];
    labels: Record<string, string>;
    emptyMessage: string;
    tone: 'blue' | 'green' | 'violet';
}) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const barColor =
        tone === 'green'
            ? 'bg-[#00a63e]'
            : tone === 'violet'
              ? 'bg-[#7c3aed]'
              : 'bg-[#1e3a8a]';

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <ChartHeading title={title} description={description} />
            {total === 0 ? (
                <SmallEmptyState message={emptyMessage} />
            ) : (
                <div className="mt-5 space-y-4">
                    {data.map((item) => (
                        <div key={item.key} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-[#1e2939]">
                                    {labels[item.key] ?? formatLabel(item.key)}
                                </span>
                                <span className="text-xs font-semibold text-[#4a5565]">
                                    {formatNumber(item.count)} reports,{' '}
                                    {formatPercentage(item.percentage)}
                                </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-[#edf2f7]">
                                <div
                                    className={`h-full rounded-full ${barColor}`}
                                    style={{
                                        width: `${Math.max(item.percentage ?? 0, item.count === 0 ? 0 : 4)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <p className="sr-only">
                        {title}:{' '}
                        {data
                            .map(
                                (item) =>
                                    `${labels[item.key] ?? formatLabel(item.key)} ${item.count}`,
                            )
                            .join(', ')}
                        .
                    </p>
                </div>
            )}
        </article>
    );
}

function RegionalBudgetPanel({
    budget,
}: {
    budget: ProjectReportBudgetAnalytics;
}) {
    const items = [
        ['Allotted', budget.totals.allotted_budget, 'bg-[#1e3a8a]'],
        ['Released', budget.totals.released_amount, 'bg-[#009966]'],
        ['Obligated', budget.totals.obligated_amount, 'bg-[#f97316]'],
        ['Utilized', budget.totals.utilized_amount, 'bg-[#7c3aed]'],
    ] as const;
    const maxAmount = Math.max(
        ...items.map(([, amount]) => Math.abs(parseDecimal(amount))),
    );

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <ChartHeading
                title="Regional Budget Comparison"
                description="Allotted, released, obligated, and utilized totals from the API."
            />
            {budget.totals.report_count === 0 ? (
                <SmallEmptyState message="No budget data is available for the selected filters." />
            ) : (
                <div className="mt-5 space-y-4">
                    {items.map(([label, amount, color]) => (
                        <BudgetBar
                            key={label}
                            label={label}
                            amount={amount}
                            maxAmount={maxAmount}
                            color={color}
                        />
                    ))}
                    <p className="text-xs leading-5 text-[#6a7282]">
                        Overall utilization:{' '}
                        <span className="font-semibold text-[#1e2939]">
                            {formatPercentage(
                                budget.totals.utilization_percentage,
                            )}
                        </span>
                    </p>
                </div>
            )}
        </article>
    );
}

function AgencyBudgetComparisonChart({
    agencies,
}: {
    agencies: ProjectReportAgencyComparison[];
}) {
    const visible = agencies.filter((agency) => agency.report_count > 0);
    const maxAmount = Math.max(
        ...visible.flatMap((agency) => [
            Math.abs(parseDecimal(agency.allotted_budget)),
            Math.abs(parseDecimal(agency.utilized_amount)),
        ]),
        0,
    );

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <ChartHeading
                title="Allotted Versus Utilized by Agency"
                description="Agency comparison uses backend-returned values only."
            />
            {visible.length === 0 ? (
                <SmallEmptyState message="No agency-level report analytics are available yet." />
            ) : (
                <div className="mt-5 space-y-4">
                    {visible.slice(0, 8).map((agency) => (
                        <div
                            key={agency.agency_id ?? agency.agency_name}
                            className="space-y-2"
                            title={agency.agency_name ?? undefined}
                        >
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-[#1e2939]">
                                    {agency.agency_short_name ??
                                        agency.agency_name ??
                                        'Unassigned agency'}
                                </span>
                                <span className="text-xs text-[#6a7282]">
                                    {formatNumber(agency.report_count)} reports
                                </span>
                            </div>
                            <BudgetMiniBar
                                label="Allotted"
                                amount={agency.allotted_budget}
                                maxAmount={maxAmount}
                                color="bg-[#1e3a8a]"
                            />
                            <BudgetMiniBar
                                label="Utilized"
                                amount={agency.utilized_amount}
                                maxAmount={maxAmount}
                                color="bg-[#7c3aed]"
                            />
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}

function AgencyUtilizationChart({
    agencies,
}: {
    agencies: ProjectReportAgencyComparison[];
}) {
    const visible = agencies.filter((agency) => agency.report_count > 0);

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <ChartHeading
                title="Budget Utilization by Agency"
                description="Percentages are provided by the backend analytics API."
            />
            {visible.length === 0 ? (
                <SmallEmptyState message="No agency-level report analytics are available yet." />
            ) : (
                <div className="mt-5 space-y-4">
                    {visible.slice(0, 10).map((agency) => (
                        <div
                            key={agency.agency_id ?? agency.agency_name}
                            className="space-y-2"
                            title={agency.agency_name ?? undefined}
                        >
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-[#1e2939]">
                                    {agency.agency_short_name ??
                                        agency.agency_name ??
                                        'Unassigned agency'}
                                </span>
                                <span className="text-xs font-semibold text-[#4a5565]">
                                    {formatPercentage(
                                        agency.utilization_percentage,
                                    )}
                                </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-[#edf2f7]">
                                <div
                                    className="h-full rounded-full bg-[#0f766e]"
                                    style={{
                                        width: `${Math.max(Math.min(agency.utilization_percentage ?? 0, 100), agency.utilization_percentage === null ? 0 : 4)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}

function AgencyComparisonTable({
    agencies,
    sort,
    onSortChange,
}: {
    agencies: ProjectReportAgencyComparison[];
    sort: AgencySort;
    onSortChange: (value: AgencySort) => void;
}) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                        Agency Comparison
                    </h3>
                    <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                        Regional report metrics grouped by agency.
                    </p>
                </div>
                <label
                    htmlFor="agency_comparison_sort"
                    className="w-full sm:w-[220px]"
                >
                    <span className="mb-1.5 block text-xs font-medium text-[#4a5565]">
                        Sort by
                    </span>
                    <Select
                        value={sort}
                        onValueChange={(value) =>
                            onSortChange(value as AgencySort)
                        }
                    >
                        <SelectTrigger
                            id="agency_comparison_sort"
                            className="h-10 rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] shadow-none"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {agencySortOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
            </div>
            {agencies.length === 0 ? (
                <div className="px-5 pb-5">
                    <SmallEmptyState message="No agency-level report analytics are available yet." />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                            <tr>
                                <th className="px-5 py-3">Agency</th>
                                <th className="px-4 py-3">Total Reports</th>
                                <th className="px-4 py-3">Complete</th>
                                <th className="px-4 py-3">Incomplete</th>
                                <th className="px-4 py-3">No Financial Data</th>
                                <th className="px-4 py-3">Allotted Budget</th>
                                <th className="px-4 py-3">Utilized Amount</th>
                                <th className="px-4 py-3">Remaining Balance</th>
                                <th className="px-5 py-3">Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agencies.map((agency) => (
                                <tr
                                    key={agency.agency_id ?? agency.agency_name}
                                    className="border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="max-w-[260px] px-5 py-4">
                                        <p className="truncate font-medium text-[#1e2939]">
                                            {agency.agency_short_name ??
                                                agency.agency_name ??
                                                'Unassigned agency'}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-[#6a7282]">
                                            {agency.agency_name ??
                                                'No agency name reported'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNumber(agency.report_count)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNumber(agency.complete_count)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNumber(agency.incomplete_count)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNumber(
                                            agency.reports_without_financial_data,
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatCurrency(agency.allotted_budget)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatCurrency(agency.utilized_amount)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatCurrency(
                                            agency.remaining_balance,
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-[#4a5565]">
                                        {formatPercentage(
                                            agency.utilization_percentage,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}

function ProjectReportRecordsTable({
    isLoading,
    error,
    records,
    pagination,
    onRetry,
    onPageChange,
}: {
    isLoading: boolean;
    error: string;
    records: ProjectReportAnalyticsRecord[];
    pagination: ApiPagination | null;
    onRetry: () => void;
    onPageChange: (page: number) => void;
}) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-2 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                        Detailed Regional Records
                    </h3>
                    <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                        Server-paginated report rows with backend-calculated
                        classifications.
                    </p>
                </div>
                <p className="text-xs text-[#6a7282]" aria-live="polite">
                    {!pagination || pagination.total === 0
                        ? 'No records'
                        : `${pagination.from ?? 0}-${pagination.to ?? 0} of ${formatNumber(
                              pagination.total,
                          )}`}
                </p>
            </div>

            {isLoading ? (
                <div aria-live="polite" aria-busy="true" className="p-5">
                    <Skeleton className="h-[320px] rounded-[12px]" />
                </div>
            ) : null}

            {!isLoading && error ? (
                <div className="p-5">
                    <ProjectReportErrorState
                        message={error}
                        onRetry={onRetry}
                    />
                </div>
            ) : null}

            {!isLoading && !error && records.length === 0 ? (
                <div className="px-6 pb-6">
                    <SmallEmptyState message="No Terminal Reports or Project Accomplishment Reports are available for the selected filters." />
                </div>
            ) : null}

            {!isLoading && !error && records.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1520px] text-left text-sm">
                        <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                            <tr>
                                <th className="px-6 py-3">Report Title</th>
                                <th className="px-4 py-3">Agency</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Period</th>
                                <th className="px-4 py-3">Year</th>
                                <th className="px-4 py-3">Workflow</th>
                                <th className="px-4 py-3">Completeness</th>
                                <th className="px-4 py-3">
                                    Physical Accomplishment
                                </th>
                                <th className="px-4 py-3">Allotted</th>
                                <th className="px-4 py-3">Utilized</th>
                                <th className="px-4 py-3">Balance</th>
                                <th className="px-4 py-3">Budget Use</th>
                                <th className="px-4 py-3">Financial Data</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => (
                                <tr
                                    key={record.research_id}
                                    className="border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="max-w-[260px] px-6 py-4">
                                        <p className="truncate font-medium text-[#1e2939]">
                                            {record.title}
                                        </p>
                                    </td>
                                    <td
                                        className="max-w-[180px] px-4 py-4"
                                        title={record.agency?.name ?? undefined}
                                    >
                                        <p className="truncate text-[#4a5565]">
                                            {record.agency?.short_name ??
                                                record.agency?.name ??
                                                'Not reported'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {reportTypeLabel(record.report_type)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {record.reporting_period ??
                                            'Not reported'}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {record.publication_year ??
                                            'Not reported'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusPill
                                            label={formatLabel(
                                                record.workflow_status,
                                            )}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNullablePercentage(
                                            record.completeness.percentage,
                                            'Not reported',
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNullablePercentage(
                                            record.accomplishment
                                                .physical_accomplishment_percentage,
                                            'Not reported',
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatMoneyOrStatus(
                                            record.budget.allotted_budget,
                                            record.budget.data_status,
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatMoneyOrStatus(
                                            record.budget.utilized_amount,
                                            record.budget.data_status,
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatMoneyOrStatus(
                                            record.budget.remaining_balance,
                                            record.budget.data_status,
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNullablePercentage(
                                            record.budget
                                                .utilization_percentage,
                                            record.budget.data_status ===
                                                'not_reported'
                                                ? 'Not reported'
                                                : 'Not available',
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusPill
                                            label={
                                                record.budget.data_status ===
                                                'reported'
                                                    ? 'Reported'
                                                    : 'Not reported'
                                            }
                                            muted={
                                                record.budget.data_status !==
                                                'reported'
                                            }
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={`/admin/analytics/project-reports/${record.research_id}`}
                                            className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#1e3a8a] hover:bg-[#f9fafb]"
                                        >
                                            <FolderOpen className="size-3.5" />
                                            View Analytics
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {pagination ? (
                <div className="flex flex-col gap-3 border-t border-[#f3f4f6] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#6a7282]">
                        Page {pagination.current_page} of {pagination.last_page}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() =>
                                onPageChange(pagination.current_page - 1)
                            }
                        >
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                                pagination.current_page >= pagination.last_page
                            }
                            onClick={() =>
                                onPageChange(pagination.current_page + 1)
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </article>
    );
}

function ProjectReportLoadingState() {
    return (
        <div aria-live="polite" aria-busy="true" className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton
                        key={index}
                        className="h-[132px] rounded-[14px]"
                    />
                ))}
            </section>
            <section className="grid gap-5 xl:grid-cols-2">
                <Skeleton className="h-[320px] rounded-[14px]" />
                <Skeleton className="h-[320px] rounded-[14px]" />
            </section>
            <Skeleton className="h-[420px] rounded-[14px]" />
        </div>
    );
}

function ProjectReportErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <section
            role="alert"
            className="rounded-[14px] border border-[#ffc9c9] bg-[#fef2f2] p-6"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#e7000b]" />
                    <div>
                        <h3 className="text-sm font-semibold text-[#991b1b]">
                            Unable to load project report analytics
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-[#991b1b]">
                            {message}
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" onClick={onRetry}>
                    Retry
                </Button>
            </div>
        </section>
    );
}

function ProjectReportEmptyState({
    filtered,
    onClearFilters,
}: {
    filtered: boolean;
    onClearFilters: () => void;
}) {
    return (
        <section className="rounded-[14px] border border-dashed border-[#d1d5dc] bg-white p-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-[12px] bg-[#eff6ff] text-[#1e3a8a]">
                <BarChart3 className="size-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[#1e2939]">
                No report analytics are available yet.
            </h3>
            <p className="mx-auto mt-2 max-w-[560px] text-sm leading-5 text-[#6a7282]">
                No Terminal Reports or Project Accomplishment Reports are
                available for the selected filters.
            </p>
            {filtered ? (
                <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={onClearFilters}
                >
                    Reset filters
                </Button>
            ) : null}
        </section>
    );
}

function SmallEmptyState({ message }: { message: string }) {
    return (
        <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d1d5dc] bg-[#f9fafb] px-6 py-8 text-center">
            <Building2 className="size-8 text-[#6a7282]" />
            <p className="mt-3 max-w-[360px] text-sm leading-5 text-[#6a7282]">
                {message}
            </p>
        </div>
    );
}

function ChartHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                {title}
            </h3>
            <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                {description}
            </p>
        </div>
    );
}

function BudgetBar({
    label,
    amount,
    maxAmount,
    color,
}: {
    label: string;
    amount: string;
    maxAmount: number;
    color: string;
}) {
    const value = parseDecimal(amount);
    const width = maxAmount > 0 ? (Math.abs(value) / maxAmount) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-[#1e2939]">{label}</span>
                <span className="text-xs font-semibold text-[#4a5565]">
                    {formatCurrency(amount)}
                </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#edf2f7]">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{
                        width: `${Math.max(width, value === 0 ? 0 : 4)}%`,
                    }}
                />
            </div>
        </div>
    );
}

function BudgetMiniBar({
    label,
    amount,
    maxAmount,
    color,
}: {
    label: string;
    amount: string;
    maxAmount: number;
    color: string;
}) {
    const value = parseDecimal(amount);
    const width = maxAmount > 0 ? (Math.abs(value) / maxAmount) * 100 : 0;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[#6a7282]">
                <span>{label}</span>
                <span className="font-semibold text-[#4a5565]">
                    {formatCurrency(amount)}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#edf2f7]">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{
                        width: `${Math.max(width, value === 0 ? 0 : 4)}%`,
                    }}
                />
            </div>
        </div>
    );
}

function StatusPill({
    label,
    muted = false,
}: {
    label: string;
    muted?: boolean;
}) {
    return (
        <span
            className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-xs leading-4 font-medium ${
                muted
                    ? 'border-[#e5e7eb] bg-[#f8fafc] text-[#64748b]'
                    : 'border-[#bedbff] bg-[#eff6ff] text-[#1447e6]'
            }`}
        >
            {label}
        </span>
    );
}

function reportTypeLabel(value: string) {
    return (
        reportTypeOptions.find((option) => option.value === value)?.label ??
        formatLabel(value)
    );
}

function formatLabel(value: string) {
    return value
        .split(/[-_]/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

function parseDecimal(value: string | null | undefined) {
    if (value === null || value === undefined || value.trim() === '') {
        return 0;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: string | null | undefined) {
    if (value === null || value === undefined || value.trim() === '') {
        return 'Not reported';
    }

    const amount = parseDecimal(value);
    const formatted = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    return amount < 0 ? `-${formatted}` : formatted;
}

function formatPercentage(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return 'Not available';
    }

    return `${value.toFixed(2)}%`;
}

function formatNullablePercentage(
    value: number | null | undefined,
    fallback: string,
) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return fallback;
    }

    return formatPercentage(value);
}

function formatMoneyOrStatus(
    value: string | null | undefined,
    status: string | undefined,
) {
    if (value === null || value === undefined) {
        return status === 'not_reported' ? 'Not reported' : 'Not available';
    }

    return formatCurrency(value);
}

function agencySortNumber(
    agency: ProjectReportAgencyComparison,
    sort: AgencySort,
) {
    if (
        sort === 'allotted_budget' ||
        sort === 'utilized_amount' ||
        sort === 'utilization_percentage'
    ) {
        const value = agency[sort];

        return typeof value === 'number' ? value : parseDecimal(value);
    }

    return agency[sort];
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError';
}

const workflowStatusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    published: 'Published',
    archived: 'Archived',
    superseded: 'Superseded',
};

const completenessLabels: Record<string, string> = {
    not_started: 'Not Started',
    incomplete: 'Incomplete',
    complete: 'Complete',
};

const accomplishmentLabels: Record<string, string> = {
    not_reported: 'Not Reported',
    not_started: 'Not Started',
    in_progress: 'In Progress',
    substantially_complete: 'Substantially Complete',
    complete: 'Complete',
};
