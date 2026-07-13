import {
    AlertTriangle,
    BarChart3,
    ClipboardCheck,
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
import { getProjectReportAnalytics } from '@/lib/analytics/project-report-analytics-service';
import type {
    AccomplishmentClassification,
    ApiPagination,
    BudgetClassification,
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

const initialFilters: ProjectReportAnalyticsFilters = {
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

type ProjectReportAnalyticsState = {
    summary: ProjectReportSummary;
    status: ProjectReportStatusAnalytics;
    budget: ProjectReportBudgetAnalytics;
    records: ProjectReportAnalyticsRecord[];
    pagination: ApiPagination;
};

export function ProjectReportAnalyticsSection() {
    const [filters, setFilters] =
        useState<ProjectReportAnalyticsFilters>(initialFilters);
    const [publicationYearDraft, setPublicationYearDraft] = useState('');
    const [fundingSourceDraft, setFundingSourceDraft] = useState('');
    const [page, setPage] = useState(1);
    const [analytics, setAnalytics] =
        useState<ProjectReportAnalyticsState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setFilters((current) => {
                if (
                    (current.funding_source ?? '') === fundingSourceDraft &&
                    (current.publication_year ?? '') === publicationYearDraft
                ) {
                    return current;
                }

                setIsLoading(true);
                setError('');
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

        getProjectReportAnalytics(
            filters,
            { page, perPage: recordsPerPage },
            controller.signal,
        )
            .then((payload) => {
                if (!isCurrent) {
                    return;
                }

                setAnalytics(payload);
                setIsLoading(false);
            })
            .catch((requestError: unknown) => {
                if (!isCurrent || isAbortError(requestError)) {
                    return;
                }

                setError(
                    'Report analytics could not be loaded. Please refresh the page or try again later.',
                );
                setIsLoading(false);
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [filters, page, reloadToken]);

    const activeFilterCount = useMemo(
        () =>
            Object.values(filters).filter(
                (value) => value && value !== allValue,
            ).length,
        [filters],
    );

    const hasReports = (analytics?.summary.total_reports ?? 0) > 0;

    const updateFilter = (
        key: keyof ProjectReportAnalyticsFilters,
        value: string,
    ) => {
        setIsLoading(true);
        setError('');
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
        setIsLoading(true);
        setError('');
        setFilters(initialFilters);
        setPublicationYearDraft('');
        setFundingSourceDraft('');
        setPage(1);
    };

    const changePage = (nextPage: number) => {
        setIsLoading(true);
        setError('');
        setPage(nextPage);
    };

    const retry = () => {
        setIsLoading(true);
        setError('');
        setReloadToken((current) => current + 1);
    };

    return (
        <section className="space-y-5" aria-labelledby="project-report-heading">
            <div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#6a7282]">
                    <span>Agency</span>
                    <span className="text-[#99a1af]">/</span>
                    <span className="text-[#1e3a8a]">
                        Terminal and Accomplishment Reports
                    </span>
                </div>
                <h2
                    id="project-report-heading"
                    className="mt-2 text-[22px] leading-8 font-bold text-[#1e3a8a]"
                >
                    Project Report Analytics
                </h2>
                <p className="mt-1 max-w-[760px] text-sm leading-5 text-[#6a7282]">
                    Monitor report completeness, workflow status, physical
                    accomplishment, and budget utilization from submitted
                    Terminal Reports and Project Accomplishment Reports.
                </p>
            </div>

            <ProjectReportFilters
                filters={filters}
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

            {isLoading ? <ProjectReportLoadingState /> : null}

            {!isLoading && error ? (
                <ProjectReportErrorState message={error} onRetry={retry} />
            ) : null}

            {!isLoading && !error && analytics && !hasReports ? (
                <ProjectReportEmptyState
                    filtered={activeFilterCount > 0}
                    onClearFilters={clearFilters}
                />
            ) : null}

            {!isLoading && !error && analytics && hasReports ? (
                <>
                    <ProjectReportSummaryCards summary={analytics.summary} />

                    <section className="grid gap-5 xl:grid-cols-2">
                        <DistributionChart
                            title="Report Completeness"
                            description="Completeness is calculated separately from workflow status."
                            data={analytics.status.completeness}
                            labels={completenessLabels}
                            emptyMessage="No Terminal Reports or Project Accomplishment Reports are available for the selected filters."
                            tone="blue"
                        />
                        <DistributionChart
                            title="Workflow Status"
                            description="Current research workflow status for matching report records."
                            data={analytics.status.workflow_status.filter(
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
                            description="Classification supplied by the backend accomplishment service."
                            data={analytics.status.accomplishment}
                            labels={accomplishmentLabels}
                            emptyMessage="No accomplishment data is available for the selected filters."
                            tone="violet"
                        />
                        <BudgetAnalyticsPanel budget={analytics.budget} />
                    </section>

                    <ProjectReportRecordsTable
                        records={analytics.records}
                        pagination={analytics.pagination}
                        onPageChange={changePage}
                    />
                </>
            ) : null}
        </section>
    );
}

function ProjectReportFilters({
    filters,
    publicationYearDraft,
    fundingSourceDraft,
    activeFilterCount,
    onFilterChange,
    onPublicationYearChange,
    onFundingSourceChange,
    onClearFilters,
}: {
    filters: ProjectReportAnalyticsFilters;
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
                        ? 'Showing all project report analytics for your agency'
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
        {
            id: 'total',
            label: 'Total Reports',
            value: formatNumber(summary.total_reports),
            icon: FileText,
            tone: 'bg-[#eff6ff] text-[#1e3a8a]',
        },
        {
            id: 'terminal',
            label: 'Terminal Reports',
            value: formatNumber(summary.terminal_reports),
            icon: FileCheck2,
            tone: 'bg-[#ecfdf5] text-[#009966]',
        },
        {
            id: 'par',
            label: 'Project Accomplishment Reports',
            value: formatNumber(summary.project_accomplishment_reports),
            icon: ClipboardCheck,
            tone: 'bg-[#fff7ed] text-[#f97316]',
        },
        {
            id: 'complete',
            label: 'Complete Reports',
            value: formatNumber(summary.complete_reports),
            icon: PieChart,
            tone: 'bg-[#f5f3ff] text-[#7c3aed]',
        },
        {
            id: 'incomplete',
            label: 'Incomplete Reports',
            value: formatNumber(summary.incomplete_reports),
            icon: BarChart3,
            tone: 'bg-[#fef2f2] text-[#dc2626]',
        },
        {
            id: 'with-financial',
            label: 'Reports with Financial Data',
            value: formatNumber(summary.reports_with_financial_data),
            icon: WalletCards,
            tone: 'bg-[#ecfeff] text-[#087f8c]',
        },
        {
            id: 'without-financial',
            label: 'Reports without Financial Data',
            value: formatNumber(summary.reports_without_financial_data),
            icon: WalletCards,
            tone: 'bg-[#f8fafc] text-[#64748b]',
        },
        {
            id: 'allotted',
            label: 'Total Allotted Budget',
            value: formatCurrency(summary.total_allotted_budget),
            icon: Landmark,
            tone: 'bg-[#eff6ff] text-[#1e3a8a]',
        },
        {
            id: 'utilized',
            label: 'Total Utilized Amount',
            value: formatCurrency(summary.total_utilized_amount),
            icon: Landmark,
            tone: 'bg-[#ecfdf5] text-[#009966]',
        },
        {
            id: 'remaining',
            label: 'Remaining Balance',
            value: formatCurrency(summary.total_remaining_balance),
            icon: Landmark,
            tone:
                parseDecimal(summary.total_remaining_balance) < 0
                    ? 'bg-[#fef2f2] text-[#dc2626]'
                    : 'bg-[#f8fafc] text-[#64748b]',
        },
        {
            id: 'utilization',
            label: 'Overall Budget Utilization',
            value: formatPercentage(summary.overall_utilization_percentage),
            icon: PieChart,
            tone: 'bg-[#fff7ed] text-[#f97316]',
        },
    ];

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article
                        key={card.id}
                        className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]"
                    >
                        <span
                            className={`flex size-10 items-center justify-center rounded-[10px] ${card.tone}`}
                        >
                            <Icon className="size-5" />
                        </span>
                        <p className="mt-4 text-[24px] leading-8 font-bold break-words text-[#1e2939]">
                            {card.value}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                            {card.label}
                        </p>
                    </article>
                );
            })}
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
    const max = Math.max(...data.map((item) => item.count), 0);
    const barClass = {
        blue: 'bg-[#2563eb]',
        green: 'bg-[#009966]',
        violet: 'bg-[#7c3aed]',
    }[tone];

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading title={title} description={description} />

            {total === 0 ? (
                <SmallEmptyState message={emptyMessage} />
            ) : (
                <div
                    className="mt-5 space-y-4"
                    role="img"
                    aria-label={`${title}: ${data
                        .map(
                            (item) =>
                                `${labels[item.key] ?? formatLabel(item.key)} ${item.count}`,
                        )
                        .join(', ')}`}
                >
                    {data.map((item) => {
                        const width = max > 0 ? (item.count / max) * 100 : 0;

                        return (
                            <div key={item.key} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium text-[#1e2939]">
                                        {labels[item.key] ??
                                            formatLabel(item.key)}
                                    </span>
                                    <span className="text-xs font-semibold text-[#4a5565]">
                                        {formatNumber(item.count)}
                                        {item.percentage !== null
                                            ? ` / ${formatPercentage(item.percentage)}`
                                            : ''}
                                    </span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f7]">
                                    <div
                                        className={`h-full rounded-full ${barClass}`}
                                        style={{
                                            width: `${Math.max(width, 4)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </article>
    );
}

function BudgetAnalyticsPanel({
    budget,
}: {
    budget: ProjectReportBudgetAnalytics;
}) {
    const totals = budget.totals;
    const allotted = parseDecimal(totals.allotted_budget);
    const utilized = parseDecimal(totals.utilized_amount);
    const maxAmount = Math.max(Math.abs(allotted), Math.abs(utilized), 0);
    const hasOverutilization =
        totals.utilization_percentage !== null &&
        totals.utilization_percentage > 100;

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading
                title="Budget Analytics"
                description="Aggregate financial values from persisted report metrics."
            />

            {hasOverutilization ? (
                <div className="mt-4 flex gap-2 rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm leading-5 text-[#9a3412]">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                        Reported utilization exceeds the allotted budget. Verify
                        the submitted financial figures.
                    </span>
                </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <BudgetStat
                    label="Allotted Budget"
                    value={formatCurrency(totals.allotted_budget)}
                />
                <BudgetStat
                    label="Released Amount"
                    value={formatCurrency(totals.released_amount)}
                />
                <BudgetStat
                    label="Obligated Amount"
                    value={formatCurrency(totals.obligated_amount)}
                />
                <BudgetStat
                    label="Utilized Amount"
                    value={formatCurrency(totals.utilized_amount)}
                />
                <BudgetStat
                    label="Remaining Balance"
                    value={formatCurrency(totals.remaining_balance)}
                />
                <BudgetStat
                    label="Utilization Percentage"
                    value={formatPercentage(totals.utilization_percentage)}
                />
                <BudgetStat
                    label="Reports Missing Financial Data"
                    value={formatNumber(totals.reports_without_financial_data)}
                />
            </div>

            <div
                className="mt-5 space-y-4"
                role="img"
                aria-label={`Allotted budget ${formatCurrency(
                    totals.allotted_budget,
                )}; utilized amount ${formatCurrency(totals.utilized_amount)}`}
            >
                <BudgetBar
                    label="Allotted"
                    amount={allotted}
                    maxAmount={maxAmount}
                    color="bg-[#1e3a8a]"
                />
                <BudgetBar
                    label="Utilized"
                    amount={utilized}
                    maxAmount={maxAmount}
                    color={hasOverutilization ? 'bg-[#dc2626]' : 'bg-[#009966]'}
                />
            </div>
        </article>
    );
}

function BudgetStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[10px] border border-[#f3f4f6] bg-[#f9fafb] p-3">
            <p className="text-xs font-medium text-[#6a7282]">{label}</p>
            <p className="mt-1 text-sm font-bold break-words text-[#1e2939]">
                {value}
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
    amount: number;
    maxAmount: number;
    color: string;
}) {
    const width = maxAmount > 0 ? (Math.abs(amount) / maxAmount) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-[#1e2939]">{label}</span>
                <span className="text-xs font-semibold text-[#4a5565]">
                    {formatCurrency(String(amount.toFixed(2)))}
                </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#edf2f7]">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{
                        width: `${Math.max(width, amount === 0 ? 0 : 4)}%`,
                    }}
                />
            </div>
        </div>
    );
}

function ProjectReportRecordsTable({
    records,
    pagination,
    onPageChange,
}: {
    records: ProjectReportAnalyticsRecord[];
    pagination: ApiPagination;
    onPageChange: (page: number) => void;
}) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-2 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                        Report Analytics Records
                    </h3>
                    <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                        Paginated report rows with backend-calculated
                        completeness, accomplishment, and budget values.
                    </p>
                </div>
                <p className="text-xs text-[#6a7282]" aria-live="polite">
                    {pagination.total === 0
                        ? 'No records'
                        : `${pagination.from ?? 0}-${pagination.to ?? 0} of ${formatNumber(
                              pagination.total,
                          )}`}
                </p>
            </div>

            {records.length === 0 ? (
                <div className="px-6 pb-6">
                    <SmallEmptyState message="No report records match the selected filters." />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1320px] text-left text-sm">
                        <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                            <tr>
                                <th className="px-6 py-3">Report Title</th>
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
                            {records.map((record) => {
                                const overutilized =
                                    record.budget.utilization_percentage !==
                                        null &&
                                    record.budget.utilization_percentage !==
                                        undefined &&
                                    record.budget.utilization_percentage > 100;

                                return (
                                    <tr
                                        key={record.research_id}
                                        className="border-b border-[#f9fafb] last:border-b-0"
                                    >
                                        <td className="max-w-[260px] px-6 py-4">
                                            <p className="truncate font-medium text-[#1e2939]">
                                                {record.title}
                                            </p>
                                            {overutilized ? (
                                                <p className="mt-1 flex items-center gap-1 text-xs text-[#c2410c]">
                                                    <AlertTriangle className="size-3.5" />
                                                    Overutilized
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 text-[#4a5565]">
                                            {reportTypeLabel(
                                                record.report_type,
                                            )}
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
                                                record.accomplishment
                                                    .data_status ===
                                                    'not_reported'
                                                    ? 'Not reported'
                                                    : 'Not available',
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
                                                    record.budget
                                                        .data_status ===
                                                    'reported'
                                                        ? 'Reported'
                                                        : 'Not reported'
                                                }
                                                muted={
                                                    record.budget
                                                        .data_status !==
                                                    'reported'
                                                }
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={`/agency/analytics/project-reports/${record.research_id}`}
                                                className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#1e3a8a] hover:bg-[#f9fafb]"
                                            >
                                                <FolderOpen className="size-3.5" />
                                                View Analytics
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

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
                            Unable to load report analytics
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
                {filtered
                    ? 'No Terminal Reports or Project Accomplishment Reports are available for the selected filters.'
                    : 'Upload or update a Terminal Report or Project Accomplishment Report to begin tracking completion and budget utilization.'}
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
        <div className="mt-5 flex min-h-[200px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d1d5dc] bg-[#f9fafb] px-6 py-8 text-center">
            <BarChart3 className="size-8 text-[#6a7282]" />
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

function StatusPill({
    label,
    muted = false,
}: {
    label: string;
    muted?: boolean;
}) {
    return (
        <span
            className={`inline-flex h-[24px] items-center rounded-full border px-2.5 text-xs font-medium ${
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
