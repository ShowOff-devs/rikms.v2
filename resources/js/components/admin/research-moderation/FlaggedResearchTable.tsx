import { AlertTriangle, CircleAlert, Copy, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    moderationIssueTypeLabels,
    moderationStatusLabels,
} from '@/data/mock-research-moderation';
import { cn } from '@/lib/utils';
import type {
    FlaggedResearchRecord,
    ModerationIssueType,
    ModerationStatus,
} from '@/types/research-moderation';
import { ModerationActionsMenu } from './ModerationActionsMenu';

type FlaggedResearchTableProps = {
    records: FlaggedResearchRecord[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onView: (record: FlaggedResearchRecord) => void;
    onReview: (record: FlaggedResearchRecord) => void;
    onResolve: (record: FlaggedResearchRecord) => void;
    onFlag: (record: FlaggedResearchRecord) => void;
    onArchive: (record: FlaggedResearchRecord) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const issueStyles: Record<
    ModerationIssueType,
    { className: string; icon: LucideIcon }
> = {
    'duplicate-research': {
        className: 'border-[#ffd6a8] bg-[#fff7ed] text-[#ca3500]',
        icon: Copy,
    },
    'incomplete-metadata': {
        className: 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]',
        icon: CircleAlert,
    },
    'policy-violation': {
        className: 'border-[#fecaca] bg-[#fef2f2] text-[#dc2626]',
        icon: AlertTriangle,
    },
    'missing-abstract': {
        className: 'border-[#e9d5ff] bg-[#faf5ff] text-[#9333ea]',
        icon: FileText,
    },
    'missing-keywords': {
        className: 'border-[#bae6fd] bg-[#f0f9ff] text-[#0284c7]',
        icon: CircleAlert,
    },
    'incomplete-author-affiliation': {
        className: 'border-[#fed7aa] bg-[#fff7ed] text-[#ea580c]',
        icon: CircleAlert,
    },
};

const statusStyles: Record<ModerationStatus, { badge: string; dot: string }> = {
    'pending-review': {
        badge: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        dot: 'bg-[#f59e0b]',
    },
    resolved: {
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        dot: 'bg-[#00c950]',
    },
    flagged: {
        badge: 'border-[#fecaca] bg-[#fef2f2] text-[#dc2626]',
        dot: 'bg-[#fb2c36]',
    },
    'needs-review': {
        badge: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
        dot: 'bg-[#2b7fff]',
    },
};

function formatDate(value: string) {
    return dateFormatter.format(new Date(value));
}

function IssueBadge({ issueType }: { issueType: ModerationIssueType }) {
    const styles = issueStyles[issueType];
    const Icon = styles.icon;

    return (
        <span
            className={cn(
                'inline-flex min-h-[26px] max-w-[150px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-3 font-semibold',
                styles.className,
            )}
        >
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{moderationIssueTypeLabels[issueType]}</span>
        </span>
    );
}

function StatusBadge({ status }: { status: ModerationStatus }) {
    const styles = statusStyles[status];

    return (
        <span
            className={cn(
                'inline-flex min-h-[26px] max-w-[130px] items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] leading-3 font-semibold',
                styles.badge,
            )}
        >
            <span className={cn('size-1.5 shrink-0 rounded-full', styles.dot)} />
            <span className="line-clamp-2">{moderationStatusLabels[status]}</span>
        </span>
    );
}

function AgencyBadge({ agency }: { agency: string }) {
    return (
        <span className="inline-flex rounded-[6px] bg-[#1e3a8a]/5 px-2 py-1 text-[11px] font-semibold text-[#1e3a8a]">
            {agency}
        </span>
    );
}

export function FlaggedResearchTable({
    records,
    isLoading,
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
    onView,
    onReview,
    onResolve,
    onFlag,
    onArchive,
}: FlaggedResearchTableProps) {
    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead className="bg-[#f9fafb]/80">
                        <tr className="h-12 text-[11px] leading-4 font-medium text-[#4a5565]">
                            <th scope="col" className="px-6">
                                Research Title
                            </th>
                            <th scope="col" className="px-6">
                                Agency
                            </th>
                            <th scope="col" className="px-6">
                                Uploaded By
                            </th>
                            <th scope="col" className="px-6">
                                Issue Type
                            </th>
                            <th scope="col" className="px-6">
                                Year
                            </th>
                            <th scope="col" className="px-6">
                                Status
                            </th>
                            <th scope="col" className="px-6">
                                Date Flagged
                            </th>
                            <th scope="col" className="px-6 text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: rowsPerPage }, (_, index) => (
                                <tr
                                    key={index}
                                    className="h-[76px] border-b border-[#f9fafb]"
                                >
                                    {Array.from({ length: 8 }, (_, cell) => (
                                        <td key={cell} className="px-6">
                                            <div className="h-3.5 rounded bg-[#f3f4f6]" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
                                        <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                                            <FileText
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <p className="mt-4 text-sm font-semibold text-[#1e2939]">
                                            No moderation records found
                                        </p>
                                        <p className="mt-1 max-w-md text-sm text-[#6a7282]">
                                            Adjust the search or filters to view
                                            flagged research records across
                                            participating agencies.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            records.map((record) => (
                                <tr
                                    key={record.id}
                                    className="h-[78px] border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="max-w-[260px] px-6">
                                        <button
                                            type="button"
                                            onClick={() => onView(record)}
                                            className="line-clamp-2 text-left text-sm leading-5 font-semibold text-[#1e3a8a] transition hover:text-[#172554] hover:underline"
                                        >
                                            {record.title}
                                        </button>
                                    </td>
                                    <td className="px-6">
                                        <AgencyBadge agency={record.agency} />
                                    </td>
                                    <td className="max-w-[160px] px-6">
                                        <p className="truncate text-xs font-medium text-[#364153]">
                                            {record.uploadedBy}
                                        </p>
                                        {record.uploaderRole ? (
                                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#99a1af]">
                                                {record.uploaderRole}
                                            </p>
                                        ) : null}
                                    </td>
                                    <td className="px-6">
                                        <IssueBadge
                                            issueType={record.issueType}
                                        />
                                    </td>
                                    <td className="px-6 text-xs text-[#4a5565]">
                                        {record.year}
                                    </td>
                                    <td className="px-6">
                                        <StatusBadge status={record.status} />
                                    </td>
                                    <td className="px-6 text-xs leading-4 text-[#99a1af]">
                                        {formatDate(record.dateFlagged)}
                                    </td>
                                    <td className="px-6">
                                        <div className="flex justify-end">
                                            <ModerationActionsMenu
                                                record={record}
                                                onView={onView}
                                                onReview={onReview}
                                                onResolve={onResolve}
                                                onFlag={onFlag}
                                                onArchive={onArchive}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex min-h-[56px] flex-col gap-3 border-t border-[#f3f4f6] px-6 py-4 text-xs text-[#99a1af] sm:flex-row sm:items-center sm:justify-between">
                <p>
                    Showing{' '}
                    {totalResults === 0
                        ? '0'
                        : `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(
                              currentPage * rowsPerPage,
                              totalResults,
                          )}`}{' '}
                    of {totalResults} records
                </p>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        className="flex size-8 items-center justify-center rounded-[8px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:opacity-40"
                        aria-label="Previous page"
                    >
                        &lt;
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                        .slice(0, 4)
                        .map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-[8px] text-xs font-semibold transition',
                                    page === currentPage
                                        ? 'bg-[#1e3a8a] text-white'
                                        : 'text-[#6a7282] hover:bg-[#f9fafb]',
                                )}
                            >
                                {page}
                            </button>
                        ))}
                    <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        className="flex size-8 items-center justify-center rounded-[8px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:opacity-40"
                        aria-label="Next page"
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </>
    );
}
