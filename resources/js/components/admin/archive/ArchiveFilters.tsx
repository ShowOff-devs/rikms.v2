import { RotateCcw, Search } from 'lucide-react';
import type {
    AdminArchiveFilters,
    ArchiveDateFilter,
    ArchiveRecordTypeFilter,
    ArchiveStatus,
} from '@/types/admin-archive';

type ArchiveFiltersProps = {
    filters: AdminArchiveFilters;
    agencies: string[];
    hasActiveFilters: boolean;
    onFiltersChange: (filters: AdminArchiveFilters) => void;
    onReset: () => void;
};

const dateOptions: Array<{ value: ArchiveDateFilter; label: string }> = [
    { value: 'all', label: 'All Archive Dates' },
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'year-2026', label: '2026' },
];

const statusOptions: Array<{ value: ArchiveStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All Statuses' },
    { value: 'archived', label: 'Archived' },
    { value: 'pending-deletion', label: 'Pending Deletion' },
    { value: 'restored', label: 'Restored' },
];

const typeOptions: Array<{ value: ArchiveRecordTypeFilter; label: string }> = [
    { value: 'all', label: 'All Record Types' },
    { value: 'research', label: 'Research' },
    { value: 'agency', label: 'Agency' },
    { value: 'user', label: 'User' },
];

export function ArchiveFilters({
    filters,
    agencies,
    hasActiveFilters,
    onFiltersChange,
    onReset,
}: ArchiveFiltersProps) {
    const setFilter = <Key extends keyof AdminArchiveFilters>(
        key: Key,
        value: AdminArchiveFilters[Key],
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="border-b border-[#f3f4f6] px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Search archived records</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                    <input
                        value={filters.search}
                        onChange={(event) =>
                            setFilter('search', event.target.value)
                        }
                        className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#1e2939] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search archived records..."
                    />
                </label>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:w-auto">
                    <select
                        value={filters.agency}
                        onChange={(event) =>
                            setFilter('agency', event.target.value)
                        }
                        className="h-[41px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 xl:w-[170px]"
                        aria-label="Agency filter"
                    >
                        <option value="all">All Agencies</option>
                        {agencies.map((agency) => (
                            <option key={agency} value={agency}>
                                {agency}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.date}
                        onChange={(event) =>
                            setFilter(
                                'date',
                                event.target.value as ArchiveDateFilter,
                            )
                        }
                        className="h-[41px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 xl:w-[154px]"
                        aria-label="Archive date filter"
                    >
                        {dateOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.status}
                        onChange={(event) =>
                            setFilter(
                                'status',
                                event.target.value as ArchiveStatus | 'all',
                            )
                        }
                        className="h-[41px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 xl:w-[158px]"
                        aria-label="Archive status filter"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.recordType}
                        onChange={(event) =>
                            setFilter(
                                'recordType',
                                event.target.value as ArchiveRecordTypeFilter,
                            )
                        }
                        className="h-[41px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 xl:w-[160px]"
                        aria-label="Record type filter"
                    >
                        {typeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={onReset}
                            className="inline-flex h-[41px] items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                        >
                            <RotateCcw className="size-4" />
                            Reset
                        </button>
                    ) : (
                        <span className="hidden lg:block" />
                    )}
                </div>
            </div>
        </div>
    );
}
