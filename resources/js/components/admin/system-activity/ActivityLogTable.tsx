import { ActivityFilters } from '@/components/admin/system-activity/ActivityFilters';
import { ActivityPagination } from '@/components/admin/system-activity/ActivityPagination';
import { cn } from '@/lib/utils';
import type {
    ActivityLog,
    ActivityLogRole,
    ActivityLogStatus,
} from '@/types/system-activity';

type ActivityLogTableProps = {
    logs: ActivityLog[];
    isLoading: boolean;
    searchQuery: string;
    selectedStatus: ActivityLogStatus | 'all';
    selectedRole: ActivityLogRole | 'all';
    selectedAgency: string;
    selectedAction: string;
    agencies: string[];
    actions: string[];
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: ActivityLogStatus | 'all') => void;
    onRoleChange: (value: ActivityLogRole | 'all') => void;
    onAgencyChange: (value: string) => void;
    onActionChange: (value: string) => void;
    onResetFilters: () => void;
    onPageChange: (page: number) => void;
};

const statusClasses = {
    pending: {
        badge: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        dot: 'bg-[#fe9a00]',
    },
    failed: {
        badge: 'border-[#ffc9c9] bg-[#fef2f2] text-[#c10007]',
        dot: 'bg-[#fb2c36]',
    },
    completed: {
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        dot: 'bg-[#00c950]',
    },
} satisfies Record<ActivityLogStatus, { badge: string; dot: string }>;

const roleClasses = {
    'Super Admin': 'bg-[#fffbeb] text-[#bb4d00]',
    'Agency Admin': 'bg-[#1e3a8a]/5 text-[#1e3a8a]',
    System: 'bg-[#f3f4f6] text-[#6a7282]',
    Unknown: 'bg-[#eef2ff] text-[#1e3a8a]',
} satisfies Record<ActivityLogRole, string>;

function ActivityStatusBadge({ status }: { status: ActivityLogStatus }) {
    const classes = statusClasses[status];
    const label = status[0].toUpperCase() + status.slice(1);

    return (
        <span
            className={cn(
                'inline-flex h-[26px] items-center gap-2 rounded-full border px-2.5 text-[11px] font-semibold',
                classes.badge,
            )}
        >
            <span className={cn('size-1.5 rounded-full', classes.dot)} />
            {label}
        </span>
    );
}

export function ActivityLogTable({
    logs,
    isLoading,
    searchQuery,
    selectedStatus,
    selectedRole,
    selectedAgency,
    selectedAction,
    agencies,
    actions,
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onSearchChange,
    onStatusChange,
    onRoleChange,
    onAgencyChange,
    onActionChange,
    onResetFilters,
    onPageChange,
}: ActivityLogTableProps) {
    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <ActivityFilters
                searchQuery={searchQuery}
                selectedStatus={selectedStatus}
                selectedRole={selectedRole}
                selectedAgency={selectedAgency}
                selectedAction={selectedAction}
                agencies={agencies}
                actions={actions}
                onSearchChange={onSearchChange}
                onStatusChange={onStatusChange}
                onRoleChange={onRoleChange}
                onAgencyChange={onAgencyChange}
                onActionChange={onActionChange}
                onReset={onResetFilters}
            />

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1128px] border-collapse text-left">
                    <thead className="bg-[#f9fafb]/80">
                        <tr className="h-10 text-xs font-semibold text-[#6a7282]">
                            <th className="w-[185px] px-6">Timestamp</th>
                            <th className="w-[155px] px-6">User</th>
                            <th className="w-[110px] px-6">Role</th>
                            <th className="w-[123px] px-6">Agency</th>
                            <th className="w-[174px] px-6">Action</th>
                            <th className="w-[240px] px-6">
                                Affected Resource
                            </th>
                            <th className="w-[130px] px-6">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 8 }, (_, index) => (
                                <tr
                                    key={index}
                                    className="h-[77px] border-b border-[#f9fafb]"
                                >
                                    {Array.from({ length: 7 }, (_, cell) => (
                                        <td key={cell} className="px-6">
                                            <div className="h-3.5 rounded bg-[#f3f4f6]" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-14 text-center"
                                >
                                    <p className="text-sm font-semibold text-[#1e2939]">
                                        No activity logs found
                                    </p>
                                    <p className="mt-1 text-xs text-[#6a7282]">
                                        Adjust the search or filters to review
                                        audit activity.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="h-[77px] border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="px-6 text-xs leading-4 whitespace-nowrap text-[#6a7282]">
                                        {log.timestamp}
                                    </td>
                                    <td className="px-6 text-sm leading-5 font-semibold text-[#1e2939]">
                                        {log.user}
                                    </td>
                                    <td className="px-6">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-[8px] px-2 py-1 text-xs leading-4 font-semibold',
                                                roleClasses[log.role],
                                            )}
                                        >
                                            {log.role}
                                        </span>
                                    </td>
                                    <td className="px-6 text-xs leading-4 whitespace-nowrap text-[#4a5565]">
                                        {log.agency ?? 'System'}
                                    </td>
                                    <td className="px-6 text-sm leading-5 font-medium text-[#364153]">
                                        {log.action}
                                    </td>
                                    <td
                                        className="max-w-[260px] truncate px-6 text-xs leading-4 whitespace-nowrap text-[#6a7282]"
                                        title={log.affectedResource}
                                    >
                                        {log.affectedResource}
                                    </td>
                                    <td className="px-6">
                                        <ActivityStatusBadge
                                            status={log.status}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ActivityPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                rowsPerPage={rowsPerPage}
                onPageChange={onPageChange}
            />
        </section>
    );
}
