import { Building2, CalendarDays, FileText, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { archiveStatusLabels } from '@/data/admin-archive-options';
import { cn } from '@/lib/utils';
import type {
    AdminArchivedRecord,
    ArchiveRecordType,
    ArchiveStatus,
} from '@/types/admin-archive';
import { ArchiveActionsMenu } from './ArchiveActionsMenu';
import { ArchiveEmptyState } from './ArchiveEmptyState';
import { ArchivePagination } from './ArchivePagination';

type ArchiveTableProps = {
    activeTab: ArchiveRecordType;
    records: AdminArchivedRecord[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onView: (record: AdminArchivedRecord) => void;
    onRestore: (record: AdminArchivedRecord) => void;
    onDelete: (record: AdminArchivedRecord) => void;
    onResetFilters: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const statusClasses: Record<ArchiveStatus, { badge: string; dot: string }> = {
    archived: {
        badge: 'border-[#e5e7eb] bg-[#f3f4f6] text-[#4a5565]',
        dot: 'bg-[#6a7282]',
    },
    'pending-deletion': {
        badge: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        dot: 'bg-[#fe9a00]',
    },
    restored: {
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        dot: 'bg-[#00c950]',
    },
};

function formatArchiveDate(value: string) {
    return dateFormatter.format(new Date(value));
}

function StatusBadge({ status }: { status: ArchiveStatus }) {
    const styles = statusClasses[status];

    return (
        <span
            className={cn(
                'inline-flex h-[26px] items-center gap-2 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap',
                styles.badge,
            )}
        >
            <span className={cn('size-1.5 rounded-full', styles.dot)} />
            {archiveStatusLabels[status]}
        </span>
    );
}

function RecordTitle({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1e3a8a]">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="line-clamp-2 text-sm leading-5 font-semibold text-[#1e2939]">
                    {title}
                </p>
                {description ? (
                    <p className="mt-0.5 truncate text-[11px] leading-4 text-[#99a1af]">
                        {description}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function tableHeaders(activeTab: ArchiveRecordType) {
    if (activeTab === 'agency') {
        return [
            'Agency Name',
            'Short Name',
            'Agency Type',
            'Archived By',
            'Archive Date',
            'Status',
            'Actions',
        ];
    }

    if (activeTab === 'user') {
        return [
            'User Name',
            'Email',
            'Role',
            'Agency',
            'Archived By',
            'Archive Date',
            'Status',
            'Actions',
        ];
    }

    return [
        'Research Title',
        'Agency',
        'Author/s',
        'Year',
        'Archived By',
        'Archive Date',
        'Status',
        'Actions',
    ];
}

export function ArchiveTable({
    activeTab,
    records,
    isLoading,
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
    onView,
    onRestore,
    onDelete,
    onResetFilters,
}: ArchiveTableProps) {
    const headers = tableHeaders(activeTab);
    const colSpan = headers.length;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead className="bg-[#f9fafb]/80">
                        <tr className="h-10 text-xs font-semibold text-[#6a7282]">
                            {headers.map((header) => (
                                <th
                                    key={header}
                                    scope="col"
                                    className={cn(
                                        'px-6',
                                        header === 'Actions' && 'text-right',
                                    )}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: rowsPerPage }, (_, index) => (
                                <tr
                                    key={index}
                                    className="h-[76px] border-b border-[#f9fafb]"
                                >
                                    {Array.from(
                                        { length: colSpan },
                                        (_, cell) => (
                                            <td key={cell} className="px-6">
                                                <div className="h-3.5 rounded bg-[#f3f4f6]" />
                                            </td>
                                        ),
                                    )}
                                </tr>
                            ))
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={colSpan}>
                                    <ArchiveEmptyState
                                        onReset={onResetFilters}
                                    />
                                </td>
                            </tr>
                        ) : (
                            records.map((record) => {
                                if (record.type === 'agency') {
                                    return (
                                        <tr
                                            key={record.id}
                                            className="h-[76px] border-b border-[#f9fafb] last:border-b-0"
                                        >
                                            <td className="max-w-[310px] px-6">
                                                <RecordTitle
                                                    icon={Building2}
                                                    title={record.name}
                                                    description="Agency record"
                                                />
                                            </td>
                                            <td className="px-6 text-sm font-semibold text-[#1e3a8a]">
                                                {record.shortName}
                                            </td>
                                            <td className="px-6 text-xs text-[#4a5565]">
                                                {record.agencyType}
                                            </td>
                                            <td className="px-6 text-xs text-[#6a7282]">
                                                {record.archivedBy}
                                            </td>
                                            <td className="px-6 text-xs text-[#6a7282]">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays className="size-3" />
                                                    {formatArchiveDate(
                                                        record.archiveDate,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6">
                                                <StatusBadge
                                                    status={record.status}
                                                />
                                            </td>
                                            <td className="px-6">
                                                <div className="flex justify-end">
                                                    <ArchiveActionsMenu
                                                        record={record}
                                                        onView={onView}
                                                        onRestore={onRestore}
                                                        onDelete={onDelete}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                if (record.type === 'user') {
                                    return (
                                        <tr
                                            key={record.id}
                                            className="h-[76px] border-b border-[#f9fafb] last:border-b-0"
                                        >
                                            <td className="max-w-[220px] px-6">
                                                <RecordTitle
                                                    icon={UserRound}
                                                    title={record.fullName}
                                                    description={record.role}
                                                />
                                            </td>
                                            <td className="px-6 text-xs text-[#4a5565]">
                                                {record.email}
                                            </td>
                                            <td className="px-6">
                                                <span className="inline-flex rounded-[8px] bg-[#1e3a8a]/5 px-2 py-1 text-xs font-semibold text-[#1e3a8a]">
                                                    {record.role}
                                                </span>
                                            </td>
                                            <td className="px-6 text-xs text-[#4a5565]">
                                                {record.agency ?? 'System'}
                                            </td>
                                            <td className="px-6 text-xs text-[#6a7282]">
                                                {record.archivedBy}
                                            </td>
                                            <td className="px-6 text-xs text-[#6a7282]">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays className="size-3" />
                                                    {formatArchiveDate(
                                                        record.archiveDate,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6">
                                                <StatusBadge
                                                    status={record.status}
                                                />
                                            </td>
                                            <td className="px-6">
                                                <div className="flex justify-end">
                                                    <ArchiveActionsMenu
                                                        record={record}
                                                        onView={onView}
                                                        onRestore={onRestore}
                                                        onDelete={onDelete}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr
                                        key={record.id}
                                        className="h-[76px] border-b border-[#f9fafb] last:border-b-0"
                                    >
                                        <td className="max-w-[300px] px-6">
                                            <RecordTitle
                                                icon={FileText}
                                                title={record.title}
                                                description="Research record"
                                            />
                                        </td>
                                        <td className="px-6 text-xs text-[#4a5565]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Building2 className="size-3" />
                                                {record.agency}
                                            </span>
                                        </td>
                                        <td className="max-w-[190px] px-6 text-xs leading-5 text-[#4a5565]">
                                            {record.authors.join(', ')}
                                        </td>
                                        <td className="px-6 text-xs text-[#6a7282]">
                                            {record.year}
                                        </td>
                                        <td className="px-6 text-xs text-[#6a7282]">
                                            {record.archivedBy}
                                        </td>
                                        <td className="px-6 text-xs text-[#6a7282]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarDays className="size-3" />
                                                {formatArchiveDate(
                                                    record.archiveDate,
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6">
                                            <StatusBadge
                                                status={record.status}
                                            />
                                        </td>
                                        <td className="px-6">
                                            <div className="flex justify-end">
                                                <ArchiveActionsMenu
                                                    record={record}
                                                    onView={onView}
                                                    onRestore={onRestore}
                                                    onDelete={onDelete}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ArchivePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                rowsPerPage={rowsPerPage}
                onPageChange={onPageChange}
            />
        </>
    );
}
