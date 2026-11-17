import type {
    AgencyResearchPerformanceItem,
    AgencyResearchReportDetail,
} from '@/lib/agency/agency-research-service';
import type { RepositoryViewContentProps } from './repository-view-content';
import { DetailBlock, Metric, Taxonomy } from './ResearchStudyView';

export function ReportDocumentView({
    item,
    record,
    summaryLabel,
}: RepositoryViewContentProps & { summaryLabel: string }) {
    const detail = record?.report_detail;
    const performanceItems = record?.performance_items ?? [];
    const highlights = record?.report_highlights ?? [];

    return (
        <div className="space-y-5">
            <section>
                <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                    {summaryLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6a7282]">
                    {item.abstract ||
                        'No report description has been provided.'}
                </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Implementing Agency" value={item.agency} />
                <MetricCard
                    label="Reporting Period"
                    value={detail?.reporting_period}
                />
                <MetricCard label="Reporting Year" value={String(item.year)} />
                <MetricCard
                    label="Physical Accomplishment"
                    value={percentage(detail?.physical_accomplishment_percent)}
                />
            </section>

            <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <DetailBlock label="Project Timeline">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                        <dt className="text-[#6a7282]">Start</dt>
                        <dd>{formatDate(detail?.project_start_date)}</dd>
                        <dt className="text-[#6a7282]">End</dt>
                        <dd>{formatDate(detail?.project_end_date)}</dd>
                        <dt className="text-[#6a7282]">Financial as of</dt>
                        <dd>{formatDate(detail?.financial_as_of_date)}</dd>
                    </dl>
                </DetailBlock>
                <DetailBlock label="PAP Classification">
                    <p>
                        {detail?.pap_categories?.join(', ') || 'Not classified'}
                    </p>
                    {detail?.pap_description ? (
                        <p className="mt-2 text-xs leading-5 text-[#6a7282]">
                            {detail.pap_description}
                        </p>
                    ) : null}
                    <p className="mt-2 text-xs text-[#6a7282]">
                        Beneficiaries:{' '}
                        {detail?.beneficiary_sectors?.join(', ') ||
                            'Not specified'}
                    </p>
                </DetailBlock>
                <DetailBlock label="Authors / Contributors">
                    <div className="space-y-1">
                        {item.authors.length ? (
                            item.authors.map((author, index) => (
                                <p key={`${author.name}-${index}`}>
                                    {author.name}
                                </p>
                            ))
                        ) : (
                            <span>No contributors listed</span>
                        )}
                    </div>
                </DetailBlock>
            </section>

            <FinancialSummary detail={detail} />

            <section>
                <SectionTitle
                    title="Performance & Accomplishments"
                    count={performanceItems.length}
                />
                <div className="mt-3 space-y-2">
                    {performanceItems.length ? (
                        performanceItems.map((performance, index) => (
                            <PerformanceRow
                                key={performance.id ?? index}
                                performance={performance}
                            />
                        ))
                    ) : (
                        <EmptyState label="No performance rows recorded." />
                    )}
                </div>
                {detail?.performance_remarks ? (
                    <p className="mt-3 rounded-[10px] bg-[#fffbeb] p-3 text-xs leading-5 text-[#92400e]">
                        {detail.performance_remarks}
                    </p>
                ) : null}
            </section>

            <section>
                <SectionTitle
                    title="Project Highlights"
                    count={highlights.length}
                />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {highlights.length ? (
                        highlights.map((highlight, index) => (
                            <div
                                key={highlight.id ?? index}
                                className="rounded-[12px] border border-[#e5e7eb] p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-bold text-[#344054]">
                                        {highlight.title ||
                                            'Untitled highlight'}
                                    </p>
                                    {highlight.is_featured ? (
                                        <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[9px] font-bold text-[#92400e] uppercase">
                                            Featured
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[#6a7282]">
                                    {highlight.description || 'No description'}
                                </p>
                                <p className="mt-2 text-[10px] font-semibold text-[#99a1af] uppercase">
                                    {highlight.files?.length ?? 0} supporting
                                    file(s)
                                </p>
                            </div>
                        ))
                    ) : (
                        <EmptyState label="No project highlights recorded." />
                    )}
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                <DetailBlock label="Report Documents">
                    <div className="space-y-2">
                        {item.files.length ? (
                            item.files.map((file) => (
                                <div key={file.id ?? file.name}>
                                    <p className="font-semibold break-words">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-[#6a7282]">
                                        {file.size} · {file.status ?? 'Active'}{' '}
                                        · {formatDate(file.uploadedAt)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <span>No report PDF attached</span>
                        )}
                    </div>
                </DetailBlock>
                <DetailBlock label="Repository Readiness">
                    <div className="grid grid-cols-2 gap-3">
                        <Metric
                            label="Metadata"
                            value={`${item.metadataCompletion}%`}
                        />
                        <Metric
                            label="Digital Library"
                            value={`${item.digitalLibraryScore}%`}
                        />
                    </div>
                </DetailBlock>
            </section>

            <Taxonomy item={item} />
        </div>
    );
}

function FinancialSummary({
    detail,
}: {
    detail?: AgencyResearchReportDetail | null;
}) {
    const allocated = number(detail?.allotted_budget);
    const utilized = number(detail?.utilized_amount);
    const utilization =
        allocated !== null && allocated > 0 && utilized !== null
            ? `${Math.round((utilized / allocated) * 10000) / 100}%`
            : 'Not available';

    return (
        <section>
            <SectionTitle title="Financial Summary" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Allocated" value={currency(allocated)} />
                <MetricCard
                    label="Released"
                    value={currency(number(detail?.released_amount))}
                />
                <MetricCard
                    label="Obligated"
                    value={currency(number(detail?.obligated_amount))}
                />
                <MetricCard label="Utilized" value={currency(utilized)} />
                <MetricCard
                    label="Remaining"
                    value={currency(
                        allocated !== null && utilized !== null
                            ? allocated - utilized
                            : null,
                    )}
                />
                <MetricCard label="Utilization Rate" value={utilization} />
            </div>
        </section>
    );
}

function PerformanceRow({
    performance,
}: {
    performance: AgencyResearchPerformanceItem;
}) {
    return (
        <div className="grid gap-3 rounded-[12px] border border-[#e5e7eb] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
                <p className="text-sm font-bold text-[#344054]">
                    {performance.project_name || 'Unnamed indicator'}
                </p>
                <p className="mt-1 text-xs text-[#6a7282]">
                    Target: {value(performance.target_value)} · Actual:{' '}
                    {value(performance.actual_value)} · Unit:{' '}
                    {performance.unit || 'Not specified'}
                </p>
                {performance.remarks ? (
                    <p className="mt-1 text-xs text-[#6a7282]">
                        {performance.remarks}
                    </p>
                ) : null}
            </div>
            <div className="text-left sm:text-right">
                <p className="text-lg font-bold text-[#1e3a8a]">
                    {percentage(performance.accomplishment_percentage)}
                </p>
                <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                    {performance.project_status?.replaceAll('-', ' ') ||
                        'Not reported'}
                </p>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value: metricValue,
}: {
    label: string;
    value?: string | null;
}) {
    return (
        <div className="min-w-0 rounded-[12px] bg-[#f9fafb] p-3">
            <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                {label}
            </p>
            <p className="mt-1 text-sm font-bold break-words text-[#1e3a8a]">
                {metricValue || 'Not provided'}
            </p>
        </div>
    );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#101828]">{title}</h3>
            {count !== undefined ? (
                <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                    {count}
                </span>
            ) : null}
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <p className="rounded-[12px] border border-dashed border-[#d1d5dc] p-4 text-sm text-[#6a7282]">
            {label}
        </p>
    );
}

function number(input?: string | number | null) {
    if (input === null || input === undefined || input === '') {
        return null;
    }

    const parsed = Number(input);

    return Number.isFinite(parsed) ? parsed : null;
}

function currency(input: number | null) {
    return input === null
        ? 'Not provided'
        : new Intl.NumberFormat('en-PH', {
              style: 'currency',
              currency: 'PHP',
              maximumFractionDigits: 2,
          }).format(input);
}

function percentage(input?: string | number | null) {
    const parsed = number(input);

    return parsed === null ? 'Not provided' : `${parsed}%`;
}

function value(input?: string | number | null) {
    return input === null || input === undefined || input === ''
        ? 'Not provided'
        : String(input);
}

function formatDate(input?: string | null) {
    if (!input) {
        return 'Not provided';
    }

    const date = new Date(input);

    return Number.isNaN(date.getTime())
        ? input
        : date.toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          });
}
