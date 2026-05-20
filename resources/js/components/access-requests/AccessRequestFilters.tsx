import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type {
    AccessRequestDateFilter,
    AccessRequestFilters as AccessRequestFiltersValue,
    AccessRequestStatusFilter,
} from '@/types/access-request';

type AccessRequestFiltersProps = {
    filters: AccessRequestFiltersValue;
    organizations: string[];
    onFiltersChange: (filters: AccessRequestFiltersValue) => void;
    onClearFilters: () => void;
};

const statusOptions: Array<{
    value: AccessRequestStatusFilter;
    label: string;
}> = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
];

const dateOptions: Array<{
    value: AccessRequestDateFilter;
    label: string;
}> = [
    { value: 'all', label: 'All Dates' },
    { value: 'march-2025', label: 'March 2025' },
    { value: 'february-2025', label: 'February 2025' },
];

export function AccessRequestFilters({
    filters,
    organizations,
    onFiltersChange,
    onClearFilters,
}: AccessRequestFiltersProps) {
    const setFilter = <Key extends keyof AccessRequestFiltersValue>(
        key: Key,
        value: AccessRequestFiltersValue[Key],
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-[17px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col gap-2 lg:flex-row">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Search access requests</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                    <input
                        value={filters.search}
                        onChange={(event) =>
                            setFilter('search', event.target.value)
                        }
                        className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#1e2939] outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search requester name, email, or research title..."
                    />
                </label>

                <div className="flex gap-2">
                    <span className="hidden h-9 items-center justify-center text-[#99a1af] lg:flex">
                        <SlidersHorizontal className="size-4" />
                    </span>
                    <select
                        value={filters.status}
                        onChange={(event) =>
                            setFilter(
                                'status',
                                event.target.value as AccessRequestStatusFilter,
                            )
                        }
                        className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 sm:w-[160px]"
                        aria-label="Status filter"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                    value={filters.date}
                    onChange={(event) =>
                        setFilter(
                            'date',
                            event.target.value as AccessRequestDateFilter,
                        )
                    }
                    className="h-9 rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 sm:w-[140px]"
                    aria-label="Date filter"
                >
                    {dateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.organization}
                    onChange={(event) =>
                        setFilter('organization', event.target.value)
                    }
                    className="h-9 rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 sm:w-[240px]"
                    aria-label="Organization filter"
                >
                    <option value="all">All Organizations</option>
                    {organizations.map((organization) => (
                        <option key={organization} value={organization}>
                            {organization}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb] sm:ml-auto"
                >
                    <RotateCcw className="size-4" />
                    Reset
                </button>
            </div>
        </section>
    );
}
