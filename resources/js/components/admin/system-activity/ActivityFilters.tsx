import { Search, X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    ActivityLogRole,
    ActivityLogStatus,
} from '@/types/system-activity';

type ActivityFiltersProps = {
    searchQuery: string;
    selectedStatus: ActivityLogStatus | 'all';
    selectedRole: ActivityLogRole | 'all';
    selectedAgency: string;
    selectedAction: string;
    agencies: string[];
    actions: string[];
    onSearchChange: (value: string) => void;
    onStatusChange: (value: ActivityLogStatus | 'all') => void;
    onRoleChange: (value: ActivityLogRole | 'all') => void;
    onAgencyChange: (value: string) => void;
    onActionChange: (value: string) => void;
    onReset: () => void;
};

export function ActivityFilters({
    searchQuery,
    selectedStatus,
    selectedRole,
    selectedAgency,
    selectedAction,
    agencies,
    actions,
    onSearchChange,
    onStatusChange,
    onRoleChange,
    onAgencyChange,
    onActionChange,
    onReset,
}: ActivityFiltersProps) {
    const hasActiveFilters =
        searchQuery ||
        selectedStatus !== 'all' ||
        selectedRole !== 'all' ||
        selectedAgency !== 'all' ||
        selectedAction !== 'all';

    return (
        <div className="border-b border-[#f3f4f6] px-6 py-4">
            <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-[14px] bg-[#fffbeb] text-[#f59e0b]">
                    <Search className="size-4" aria-hidden="true" />
                </div>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    Activity Log
                </h2>
            </div>

            <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(240px,496px)_143px_134px_minmax(180px,221px)_150px_auto]">
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                        aria-hidden="true"
                    />
                    <input
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#111827] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search activity logs..."
                    />
                </div>

                <Select
                    value={selectedStatus}
                    onValueChange={(value) =>
                        onStatusChange(value as ActivityLogStatus | 'all')
                    }
                >
                    <SelectTrigger className="h-[42px] w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={selectedRole}
                    onValueChange={(value) =>
                        onRoleChange(value as ActivityLogRole | 'all')
                    }
                >
                    <SelectTrigger className="h-[42px] w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="Super Admin">Super Admin</SelectItem>
                        <SelectItem value="Agency Admin">
                            Agency Admin
                        </SelectItem>
                        <SelectItem value="System">System</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={selectedAgency} onValueChange={onAgencyChange}>
                    <SelectTrigger className="h-[42px] w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                        <SelectValue placeholder="Agency" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="all">All agencies</SelectItem>
                        {agencies.map((agency) => (
                            <SelectItem key={agency} value={agency}>
                                {agency}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedAction} onValueChange={onActionChange}>
                    <SelectTrigger className="h-[42px] w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="all">All actions</SelectItem>
                        {actions.map((action) => (
                            <SelectItem key={action} value={action}>
                                {action}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <button
                    type="button"
                    onClick={onReset}
                    disabled={!hasActiveFilters}
                    className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <X className="size-3.5" aria-hidden="true" />
                    Reset
                </button>
            </div>
        </div>
    );
}
