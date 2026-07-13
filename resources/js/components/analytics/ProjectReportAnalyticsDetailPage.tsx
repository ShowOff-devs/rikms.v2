import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    ClipboardCheck,
    FileText,
    PencilLine,
    WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getProjectReportDetail } from '@/lib/analytics/project-report-analytics-service';
import { ApiError, apiMessage } from '@/lib/api-client';
import { useAgencySession } from '@/lib/auth/agency-auth';
import type {
    ProjectReportAnalyticsDetail,
    ProjectReportPerformanceItem,
} from '@/types/project-report-analytics';

type DetailState = {
    data: ProjectReportAnalyticsDetail | null;
    isLoading: boolean;
    error: string;
    status: number | null;
};

export function ProjectReportAnalyticsDetailPage({
    researchId,
}: {
    researchId: string;
}) {
    const session = useAgencySession();
    const [search, setSearch] = useState('');
    const [reloadToken, setReloadToken] = useState(0);
    const [state, setState] = useState<DetailState>({
        data: null,
        isLoading: true,
        error: '',
        status: null,
    });

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        getProjectReportDetail(researchId, controller.signal)
            .then((data) => {
                if (!isCurrent) {
                    return;
                }

                setState({
                    data,
                    isLoading: false,
                    error: '',
                    status: null,
                });
            })
            .catch((error: unknown) => {
                if (!isCurrent || isAbortError(error)) {
                    return;
                }

                setState({
                    data: null,
                    isLoading: false,
                    error: apiMessage(
                        error,
                        'Project report analytics could not be loaded.',
                    ),
                    status: error instanceof ApiError ? error.status : null,
                });
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [researchId, reloadToken]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    return (
        <>
            <Head title="Project Report Analytics Detail" />

            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <main className="px-4 py-8 lg:px-[47px]">
                    <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
                        <DetailHeader data={state.data} />

                        {state.isLoading ? <DetailLoadingState /> : null}

                        {!state.isLoading && state.error ? (
                            <DetailErrorState
                                message={state.error}
                                status={state.status}
                                onRetry={() => {
                                    setState((current) => ({
                                        ...current,
                                        isLoading: true,
                                        error: '',
                                        status: null,
                                    }));
                                    setReloadToken((current) => current + 1);
                                }}
                            />
                        ) : null}

                        {!state.isLoading && !state.error && state.data ? (
                            <DetailContent data={state.data} />
                        ) : null}
                    </div>
                </main>
            </AgencyAdminLayout>
        </>
    );
}

function DetailHeader({ data }: { data: ProjectReportAnalyticsDetail | null }) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <Link
                        href="/agency/analytics"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#1e3a8a] hover:underline"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Project Report Analytics
                    </Link>
                    <p className="mt-4 text-xs font-medium tracking-wide text-[#6a7282] uppercase">
                        Project Report Analytics
                    </p>
                    <h1 className="mt-1 text-[24px] leading-8 font-bold text-[#1e3a8a]">
                        {data?.title ?? 'Report analytics detail'}
                    </h1>
                    <p className="mt-2 text-sm text-[#6a7282]">
                        Read-only analytics and persisted report metrics.
                    </p>
                </div>

                {data?.can_edit ? (
                    <Link
                        href={`/agency/research/${data.research_id}`}
                        className="inline-flex h-10 w-fit items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#172f70]"
                    >
                        <PencilLine className="size-4" />
                        Edit Report
                    </Link>
                ) : null}
            </div>
        </section>
    );
}

function DetailContent({ data }: { data: ProjectReportAnalyticsDetail }) {
    return (
        <>
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <InfoPanel data={data} />
                <CompletenessPanel data={data} />
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <AccomplishmentPanel data={data} />
                <BudgetPanel data={data} />
            </section>

            <PerformanceRowsPanel rows={data.performance_items} />
        </>
    );
}

function InfoPanel({ data }: { data: ProjectReportAnalyticsDetail }) {
    return (
        <Panel
            icon={<FileText className="size-5" />}
            title="Report Information"
            description="Identity, workflow, and reporting period details."
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Title" value={data.title} />
                <DetailItem
                    label="Report Type"
                    value={reportTypeLabel(data.report_type)}
                />
                <DetailItem
                    label="Agency"
                    value={
                        data.agency?.short_name ??
                        data.agency?.name ??
                        'Not reported'
                    }
                />
                <DetailItem
                    label="Publication Year"
                    value={formatNullable(data.publication_year)}
                />
                <DetailItem
                    label="Reporting Period"
                    value={formatNullable(data.reporting_period)}
                />
                <DetailItem
                    label="Workflow Status"
                    value={formatLabel(data.workflow_status)}
                />
                <DetailItem
                    label="Project Start Date"
                    value={formatDate(data.project_start_date)}
                />
                <DetailItem
                    label="Project End Date"
                    value={formatDate(data.project_end_date)}
                />
                <DetailItem
                    label="Submitted Date"
                    value={formatDate(data.submitted_at)}
                />
                <DetailItem
                    label="Approved Date"
                    value={formatDate(data.approved_at)}
                />
            </div>
        </Panel>
    );
}

function CompletenessPanel({ data }: { data: ProjectReportAnalyticsDetail }) {
    const sections = Object.entries(data.completeness.sections ?? {});

    return (
        <Panel
            icon={<ClipboardCheck className="size-5" />}
            title="Report Completeness"
            description="Completeness is separate from workflow status."
        >
            <div className="grid gap-3 sm:grid-cols-3">
                <MetricBox
                    label="Percentage"
                    value={formatPercentage(data.completeness.percentage)}
                />
                <MetricBox
                    label="Classification"
                    value={formatLabel(data.completeness.classification)}
                />
                <MetricBox
                    label="Sections"
                    value={`${data.completeness.completed_sections}/${data.completeness.total_sections}`}
                />
            </div>

            <div className="mt-5 space-y-3">
                {sections.length === 0 ? (
                    <EmptyInline message="No section detail is reported." />
                ) : (
                    sections.map(([section, value]) => (
                        <div
                            key={section}
                            className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-[#1e2939]">
                                    {formatLabel(section)}
                                </p>
                                <StatusPill
                                    label={
                                        value.complete
                                            ? 'Complete'
                                            : 'Incomplete'
                                    }
                                    muted={!value.complete}
                                />
                            </div>
                            <p className="mt-2 text-xs leading-5 text-[#6a7282]">
                                {value.missing_fields.length > 0
                                    ? `Missing: ${value.missing_fields
                                          .map(formatLabel)
                                          .join(', ')}`
                                    : 'No missing fields reported.'}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </Panel>
    );
}

function AccomplishmentPanel({ data }: { data: ProjectReportAnalyticsDetail }) {
    return (
        <Panel
            icon={<BarChart3 className="size-5" />}
            title="Physical Accomplishment"
            description="Official report-level accomplishment remains separate from performance rows."
        >
            <div className="grid gap-3 sm:grid-cols-2">
                <MetricBox
                    label="Official Accomplishment"
                    value={formatPercentage(
                        data.accomplishment.physical_accomplishment_percentage,
                        'Not reported',
                    )}
                />
                <MetricBox
                    label="Classification"
                    value={formatLabel(
                        data.accomplishment.classification ?? 'not_reported',
                    )}
                />
                <MetricBox
                    label="Source"
                    value={formatAccomplishmentSource(
                        data.accomplishment.official_value_source,
                    )}
                />
                <MetricBox
                    label="Performance Items"
                    value={`${data.accomplishment.performance_items_with_percentage ?? 0}/${data.accomplishment.performance_items_total ?? 0}`}
                />
            </div>
        </Panel>
    );
}

function BudgetPanel({ data }: { data: ProjectReportAnalyticsDetail }) {
    const budget = data.budget;

    return (
        <Panel
            icon={<WalletCards className="size-5" />}
            title="Budget Performance"
            description="Backend-calculated utilization and classification."
        >
            <div className="grid gap-3 sm:grid-cols-2">
                <MetricBox
                    label="Allotted Budget"
                    value={formatMoney(budget.allotted_budget)}
                />
                <MetricBox
                    label="Released Amount"
                    value={formatMoney(budget.released_amount)}
                />
                <MetricBox
                    label="Obligated Amount"
                    value={formatMoney(budget.obligated_amount)}
                />
                <MetricBox
                    label="Utilized Amount"
                    value={formatMoney(budget.utilized_amount)}
                />
                <MetricBox
                    label="Remaining Balance"
                    value={formatMoney(budget.remaining_balance)}
                />
                <MetricBox
                    label="Utilization"
                    value={formatPercentage(
                        budget.utilization_percentage,
                        'Not reported',
                    )}
                />
                <MetricBox
                    label="Classification"
                    value={formatLabel(budget.classification ?? 'not_reported')}
                />
                <MetricBox
                    label="Financial As-of Date"
                    value={formatDate(data.financial_as_of_date)}
                />
            </div>

            {budget.warnings && budget.warnings.length > 0 ? (
                <div className="mt-5 rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#c2410c]">
                        <AlertTriangle className="size-4" />
                        Budget warnings
                    </div>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-[#9a3412]">
                        {budget.warnings.map((warning) => (
                            <li key={warning}>{formatLabel(warning)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </Panel>
    );
}

function PerformanceRowsPanel({
    rows,
}: {
    rows: ProjectReportPerformanceItem[];
}) {
    return (
        <Panel
            icon={<ClipboardCheck className="size-5" />}
            title="Performance Rows"
            description="Persisted activity, target, actual, and accomplishment rows."
        >
            {rows.length === 0 ? (
                <EmptyInline message="No performance rows are reported." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                            <tr>
                                <th className="px-4 py-3">
                                    Activity / Output / Indicator
                                </th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Actual</th>
                                <th className="px-4 py-3">Accomplishment %</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="px-4 py-4 font-medium text-[#1e2939]">
                                        {formatNullable(row.project_name)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNullable(row.target_value)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNullable(row.actual_value)}
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatPercentage(
                                            numberOrNull(
                                                row.accomplishment_percentage,
                                            ),
                                            'Not reported',
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusPill
                                            label={formatLabel(
                                                row.project_status ??
                                                    'not_reported',
                                            )}
                                            muted={!row.project_status}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-[#4a5565]">
                                        {formatNullable(row.remarks)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}

function Panel({
    icon,
    title,
    description,
    children,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <div className="flex items-start gap-3 border-b border-[#f3f4f6] p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#eff6ff] text-[#1e3a8a]">
                    {icon}
                </span>
                <div>
                    <h2 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                        {title}
                    </h2>
                    <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                        {description}
                    </p>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                {label}
            </p>
            <p className="mt-1 text-sm leading-5 font-medium break-words text-[#1e2939]">
                {value}
            </p>
        </div>
    );
}

function MetricBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3">
            <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                {label}
            </p>
            <p className="mt-1 text-sm leading-5 font-semibold break-words text-[#1e2939]">
                {value}
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

function EmptyInline({ message }: { message: string }) {
    return (
        <div className="rounded-[10px] border border-dashed border-[#d1d5dc] bg-[#f9fafb] px-4 py-6 text-center text-sm text-[#6a7282]">
            {message}
        </div>
    );
}

function DetailLoadingState() {
    return (
        <div aria-live="polite" aria-busy="true" className="space-y-5">
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <Skeleton className="h-[360px] rounded-[14px]" />
                <Skeleton className="h-[360px] rounded-[14px]" />
            </section>
            <section className="grid gap-5 xl:grid-cols-2">
                <Skeleton className="h-[260px] rounded-[14px]" />
                <Skeleton className="h-[360px] rounded-[14px]" />
            </section>
            <Skeleton className="h-[360px] rounded-[14px]" />
        </div>
    );
}

function DetailErrorState({
    message,
    status,
    onRetry,
}: {
    message: string;
    status: number | null;
    onRetry: () => void;
}) {
    const title =
        status === 403
            ? 'Access denied'
            : status === 404
              ? 'Report not found'
              : 'Unable to load report analytics';

    return (
        <section
            role="alert"
            className="rounded-[14px] border border-[#ffc9c9] bg-[#fef2f2] p-6"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#e7000b]" />
                    <div>
                        <h2 className="text-sm font-semibold text-[#991b1b]">
                            {title}
                        </h2>
                        <p className="mt-1 text-sm leading-5 text-[#991b1b]">
                            {message}
                        </p>
                    </div>
                </div>
                {status === 403 || status === 404 ? null : (
                    <Button type="button" variant="outline" onClick={onRetry}>
                        Retry
                    </Button>
                )}
            </div>
        </section>
    );
}

function reportTypeLabel(value: string) {
    if (value === 'terminal-report') {
        return 'Terminal Report';
    }

    if (value === 'project-accomplishment') {
        return 'Project Accomplishment Report';
    }

    return formatLabel(value);
}

function formatLabel(value: string) {
    return value
        .split(/[-_]/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatNullable(value: string | number | null | undefined) {
    if (value === null || value === undefined || String(value).trim() === '') {
        return 'Not reported';
    }

    return String(value);
}

function numberOrNull(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: string | null | undefined) {
    if (!value) {
        return 'Not reported';
    }

    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
        return 'Not reported';
    }

    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(new Date(timestamp));
}

function formatMoney(value: string | null | undefined) {
    if (value === null || value === undefined || value.trim() === '') {
        return 'Not reported';
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return 'Not reported';
    }

    const formatted = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    return amount < 0 ? `-${formatted}` : formatted;
}

function formatPercentage(
    value: number | null | undefined,
    fallback = 'Not reported',
) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return fallback;
    }

    return `${value.toFixed(2)}%`;
}

function formatAccomplishmentSource(value: string | null | undefined) {
    if (value === 'report_detail') {
        return 'Official report value';
    }

    if (value === 'performance_items_average') {
        return 'Derived from performance rows';
    }

    return 'Not reported';
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError';
}
