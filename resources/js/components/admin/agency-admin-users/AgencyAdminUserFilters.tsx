import { Search, X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Agency } from '@/types/admin-users';

type AgencyAdminUserFiltersProps = {
    agencies: Agency[];
    searchQuery: string;
    selectedAgency: string;
    selectedStatus: string;
    selectedRole: string;
    onSearchChange: (value: string) => void;
    onAgencyChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onReset: () => void;
};

export function AgencyAdminUserFilters({
    agencies,
    searchQuery,
    selectedAgency,
    selectedStatus,
    selectedRole,
    onSearchChange,
    onAgencyChange,
    onStatusChange,
    onRoleChange,
    onReset,
}: AgencyAdminUserFiltersProps) {
    const hasActiveFilters =
        searchQuery || selectedAgency !== 'all' || selectedStatus !== 'all';

    return (
        <div className="grid gap-2 border-b border-[#f3f4f6] bg-white px-5 py-4 lg:grid-cols-[minmax(280px,1fr)_140px_120px_120px_auto]">
            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                    aria-hidden="true"
                />
                <input
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white pr-3 pl-9 text-sm text-[#111827] outline-none transition placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="Search users by name or email..."
                />
            </div>

            <Select value={selectedAgency} onValueChange={onAgencyChange}>
                <SelectTrigger className="h-9 w-full rounded-[8px] border-[#e5e7eb] text-xs text-[#4a5565] shadow-none">
                    <SelectValue placeholder="Agency" />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="all">All agencies</SelectItem>
                    {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                            {agency.shortName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9 w-full rounded-[8px] border-[#e5e7eb] text-xs text-[#4a5565] shadow-none">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={onRoleChange}>
                <SelectTrigger className="h-9 w-full rounded-[8px] border-[#e5e7eb] text-xs text-[#4a5565] shadow-none">
                    <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="agency-admin">Agency Admin</SelectItem>
                </SelectContent>
            </Select>

            <button
                type="button"
                onClick={onReset}
                disabled={!hasActiveFilters && selectedRole === 'all'}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <X className="size-3.5" aria-hidden="true" />
                Reset
            </button>
        </div>
    );
}

