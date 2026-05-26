import { RotateCcw, Search } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    AccessRequestMonitorFilters as AccessRequestMonitorFiltersType,
    AccessRequestStatus,
} from '@/types/access-request-monitor';

type AccessRequestFiltersProps = {
    filters: AccessRequestMonitorFiltersType;
    agencies: string[];
    organizations: string[];
    onFiltersChange: (filters: AccessRequestMonitorFiltersType) => void;
    onClearFilters: () => void;
};

export function AccessRequestFilters({
    filters,
    agencies,
    organizations,
    onFiltersChange,
    onClearFilters,
}: AccessRequestFiltersProps) {
    const updateFilter = <Key extends keyof AccessRequestMonitorFiltersType>(
        key: Key,
        value: AccessRequestMonitorFiltersType[Key],
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="grid gap-2 border-b border-[#f3f4f6] bg-white p-5 xl:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(128px,170px))_auto]">
            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                    aria-hidden="true"
                />
                <input
                    value={filters.search}
                    onChange={(event) =>
                        updateFilter('search', event.target.value)
                    }
                    className="h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white pr-3 pl-9 text-sm text-[#1e2939] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="Search requester, research title, or email..."
                />
            </div>

            <Select
                value={filters.agency}
                onValueChange={(value) => updateFilter('agency', value)}
            >
                <SelectTrigger className="h-10 w-full rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
                    <SelectValue placeholder="Agency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Agencies</SelectItem>
                    {agencies.map((agency) => (
                        <SelectItem key={agency} value={agency}>
                            {agency}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={filters.status}
                onValueChange={(value) =>
                    updateFilter('status', value as AccessRequestStatus | 'all')
                }
            >
                <SelectTrigger className="h-10 w-full rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                    updateFilter(
                        'dateRange',
                        value as AccessRequestMonitorFiltersType['dateRange'],
                    )
                }
            >
                <SelectTrigger className="h-10 w-full rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
                    <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="last-7-days">Last 7 days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 days</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.organization}
                onValueChange={(value) => updateFilter('organization', value)}
            >
                <SelectTrigger className="h-10 w-full rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
                    <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations.map((organization) => (
                        <SelectItem key={organization} value={organization}>
                            {organization}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-medium text-[#4a5565] transition hover:bg-white"
            >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
            </button>
        </div>
    );
}
