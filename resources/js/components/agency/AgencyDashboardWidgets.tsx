import {
    Archive,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Edit3,
    Eye,
    FileText,
    FolderOpen,
    Plus,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type {
    AgencyAccessRequest,
    AgencyResearchRecord,
    DashboardMetric,
    ResearchCategoryPoint,
    ResearchYearPoint,
} from '@/types/agency-dashboard';

type DashboardAction = 'upload' | 'manage' | 'requests';

const metricIcons = {
    blue: FileText,
    amber: Edit3,
    green: CheckCircle2,
    slate: Archive,
};

const metricColors = {
    blue: 'bg-[#eff6ff] text-[#1e3a8a]',
    amber: 'bg-[#fff7ed] text-[#f97316]',
    green: 'bg-[#ecfdf5] text-[#009966]',
    slate: 'bg-[#f8fafc] text-[#64748b]',
};

export function DashboardActions({
    onAction,
}: {
    onAction: (action: DashboardAction) => void;
}) {
    return (
        <div className="mt-5 flex flex-wrap gap-3">
            <button
                type="button"
                onClick={() => onAction('upload')}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
            >
                <Plus className="size-4" />
                Upload New Research
            </button>
            <button
                type="button"
                onClick={() => onAction('manage')}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#1e2939]"
            >
                <FolderOpen className="size-4" />
                Manage Research
            </button>
            <button
                type="button"
                onClick={() => onAction('requests')}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#1e2939]"
            >
                <ClipboardList className="size-4" />
                View Access Requests
            </button>
        </div>
    );
}

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
    return (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
                const Icon = metricIcons[metric.tone];

                return (
                    <article
                        key={metric.id}
                        className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className={`flex size-9 items-center justify-center rounded-[10px] ${metricColors[metric.tone]}`}
                            >
                                <Icon className="size-4" />
                            </span>
                            <div>
                                <p className="text-2xl leading-8 font-bold text-[#1e2939]">
                                    {metric.value}
                                </p>
                                <p className="text-xs leading-4 text-[#6a7282]">
                                    {metric.label}
                                </p>
                            </div>
                        </div>
                    </article>
                );
            })}
        </section>
    );
}

export function ResearchByYearChart({ data }: { data: ResearchYearPoint[] }) {
    const max = Math.max(...data.map((item) => item.count));

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                Research by Year
            </h3>
            <div className="mt-5 flex h-[188px] items-end gap-6 border-b border-l border-[#e5e7eb] px-4 pt-2">
                {data.map((item) => (
                    <div
                        key={item.year}
                        className="flex flex-1 flex-col items-center"
                    >
                        <div
                            className="w-full max-w-[64px] rounded-t-[4px] bg-[#243f91]"
                            style={{ height: `${(item.count / max) * 164}px` }}
                            title={`${item.count} studies`}
                        />
                        <span className="mt-2 text-xs leading-4 text-[#99a1af]">
                            {item.year}
                        </span>
                    </div>
                ))}
            </div>
        </article>
    );
}

export function ResearchByCategoryChart({
    data,
}: {
    data: ResearchCategoryPoint[];
}) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const segments = data.reduce<
        Array<ResearchCategoryPoint & { dash: number; offset: number }>
    >((items, item) => {
        const previousOffset =
            items.length === 0
                ? 25
                : items[items.length - 1].offset + items[items.length - 1].dash;

        return [
            ...items,
            {
                ...item,
                dash: (item.count / total) * 100,
                offset: previousOffset,
            },
        ];
    }, []);

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                Research by Category
            </h3>
            <div className="mt-4 flex flex-col items-center">
                <svg viewBox="0 0 160 160" className="size-[160px] -rotate-90">
                    {segments.map((item) => (
                        <circle
                            key={item.category}
                            cx="80"
                            cy="80"
                            r="48"
                            fill="none"
                            stroke={item.color}
                            strokeWidth="24"
                            strokeDasharray={`${item.dash} ${100 - item.dash}`}
                            strokeDashoffset={-item.offset}
                        />
                    ))}
                    <circle cx="80" cy="80" r="28" fill="white" />
                </svg>
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
                    {data.map((item) => (
                        <span
                            key={item.category}
                            className="inline-flex items-center gap-1 text-xs text-[#6a7282]"
                        >
                            <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            {item.category}
                        </span>
                    ))}
                </div>
            </div>
        </article>
    );
}

export function ResearchUploadsTable({
    records,
    onAction,
    onViewAll,
}: {
    records: AgencyResearchRecord[];
    onAction: (
        record: AgencyResearchRecord,
        action: 'view' | 'edit' | 'archive',
    ) => void;
    onViewAll: () => void;
}) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between p-6">
                <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                    Recent Research Uploads
                </h3>
                <button
                    type="button"
                    onClick={onViewAll}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1e3a8a]"
                >
                    View All <ArrowRight className="size-3.5" />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-4 py-3">Authors</th>
                            <th className="px-4 py-3">Year</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Last Updated</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => (
                            <tr
                                key={record.id}
                                className="border-b border-[#f9fafb] last:border-b-0"
                            >
                                <td className="max-w-[260px] truncate px-6 py-4 font-medium text-[#1e2939]">
                                    {record.title}
                                </td>
                                <td className="max-w-[220px] truncate px-4 py-4 text-[#6a7282]">
                                    {record.authors}
                                </td>
                                <td className="px-4 py-4 text-[#6a7282]">
                                    {record.year}
                                </td>
                                <td className="px-4 py-4 text-[#6a7282]">
                                    {record.category}
                                </td>
                                <td className="px-4 py-4">
                                    <StatusBadge status={record.status} />
                                </td>
                                <td className="px-4 py-4 text-[#6a7282]">
                                    {record.lastUpdated}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1">
                                        {[
                                            ['view', Eye],
                                            ['edit', Edit3],
                                            ['archive', Archive],
                                        ].map(([action, Icon]) => (
                                            <button
                                                key={String(action)}
                                                type="button"
                                                onClick={() =>
                                                    onAction(
                                                        record,
                                                        action as
                                                            | 'view'
                                                            | 'edit'
                                                            | 'archive',
                                                    )
                                                }
                                                className="flex size-7 items-center justify-center rounded-[8px] text-[#6a7282] hover:bg-[#f3f4f6] hover:text-[#1e3a8a]"
                                            >
                                                <Icon className="size-4" />
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

export function AccessRequestsTable({
    requests,
    onDecision,
    onViewAll,
}: {
    requests: AgencyAccessRequest[];
    onDecision: (requestId: string, decision: 'approved' | 'denied') => void;
    onViewAll: () => void;
}) {
    return (
        <article
            id="access-requests"
            className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
        >
            <div className="flex items-center justify-between p-6">
                <h3 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                    Pending Access Requests
                </h3>
                <button
                    type="button"
                    onClick={onViewAll}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1e3a8a]"
                >
                    View All <ArrowRight className="size-3.5" />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                        <tr>
                            <th className="px-6 py-3">Requester Name</th>
                            <th className="px-4 py-3">Organization</th>
                            <th className="px-4 py-3">Research Title</th>
                            <th className="px-4 py-3">Request Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((request) => (
                            <tr
                                key={request.id}
                                className="border-b border-[#f9fafb] last:border-b-0"
                            >
                                <td className="px-6 py-4 font-medium text-[#1e2939]">
                                    {request.requesterName}
                                </td>
                                <td className="px-4 py-4 text-[#6a7282]">
                                    {request.organization}
                                </td>
                                <td className="max-w-[240px] truncate px-4 py-4 text-[#6a7282]">
                                    {request.researchTitle}
                                </td>
                                <td className="px-4 py-4 text-[#6a7282]">
                                    {request.requestDate}
                                </td>
                                <td className="px-4 py-4">
                                    <StatusBadge status={request.status} />
                                </td>
                                <td className="px-6 py-4">
                                    {request.status === 'pending' ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onDecision(
                                                        request.id,
                                                        'approved',
                                                    )
                                                }
                                                className="h-[26px] rounded-[8px] border border-[#b9f8cf] bg-[#f0fdf4] px-3 text-xs font-medium text-[#008236]"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onDecision(
                                                        request.id,
                                                        'denied',
                                                    )
                                                }
                                                className="h-[26px] rounded-[8px] border border-[#ffc9c9] bg-[#fef2f2] px-3 text-xs font-medium text-[#e7000b]"
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-right text-xs text-[#6a7282]">
                                            Decision recorded
                                        </p>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

export function DashboardDialog({
    open,
    title,
    description,
    onOpenChange,
}: {
    open: boolean;
    title: string;
    description: string;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px]">
                <DialogHeader>
                    <DialogTitle className="text-[#1e3a8a]">
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm leading-6 text-[#4a5565]">
                    This frontend workflow is ready for Laravel API integration.
                    Form submission, file upload, and moderation endpoints can
                    be connected here without changing the dashboard layout.
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StatusBadge({
    status,
}: {
    status:
        | 'published'
        | 'draft'
        | 'archived'
        | 'pending'
        | 'approved'
        | 'denied';
}) {
    const styles = {
        published: 'border-[#b9f8cf] bg-[#dcfce7] text-[#008236]',
        draft: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        archived: 'border-[#e5e7eb] bg-[#f8fafc] text-[#4a5565]',
        pending: 'border-[#bedbff] bg-[#eff6ff] text-[#1447e6]',
        approved: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        denied: 'border-[#ffc9c9] bg-[#fef2f2] text-[#e7000b]',
    };

    return (
        <span
            className={`inline-flex h-[22px] items-center rounded-full border px-[11px] text-xs leading-4 font-medium capitalize ${styles[status]}`}
        >
            {status}
        </span>
    );
}
