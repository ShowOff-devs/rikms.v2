import { RotateCcw, Search } from 'lucide-react';
import { archiveDocumentTypeLabels } from '@/data/mock-archive';
import type {
    ArchiveDateFilter,
    ArchiveDocumentTypeFilter,
    ArchiveFilters as ArchiveFiltersValue,
} from '@/types/archive';

type ArchiveFiltersProps = {
    filters: ArchiveFiltersValue;
    hasActiveFilters: boolean;
    onFiltersChange: (filters: ArchiveFiltersValue) => void;
    onClearFilters: () => void;
};

const dateOptions: Array<{ value: ArchiveDateFilter; label: string }> = [
    { value: 'all', label: 'All Archive Dates' },
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'year-2026', label: '2026' },
];

const documentTypeOptions: Array<{
    value: ArchiveDocumentTypeFilter;
    label: string;
}> = [
    { value: 'all', label: 'All Document Types' },
    ...Object.entries(archiveDocumentTypeLabels).map(([value, label]) => ({
        value: value as ArchiveDocumentTypeFilter,
        label,
    })),
];

export function ArchiveFilters({
    filters,
    hasActiveFilters,
    onFiltersChange,
    onClearFilters,
}: ArchiveFiltersProps) {
    const setFilter = <Key extends keyof ArchiveFiltersValue>(
        key: Key,
        value: ArchiveFiltersValue[Key],
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="border-b border-[#f3f4f6] px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <label className="relative min-w-0 xl:w-[448px]">
                    <span className="sr-only">Search archived research</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                    <input
                        value={filters.search}
                        onChange={(event) =>
                            setFilter('search', event.target.value)
                        }
                        className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#1e2939] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search archived research..."
                    />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <select
                        value={filters.documentType}
                        onChange={(event) =>
                            setFilter(
                                'documentType',
                                event.target.value as ArchiveDocumentTypeFilter,
                            )
                        }
                        className="h-[37px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 sm:w-[267px]"
                        aria-label="Document type filter"
                    >
                        {documentTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
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
                        className="h-[37px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 sm:w-[159px]"
                        aria-label="Archive date filter"
                    >
                        {dateOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="inline-flex h-[37px] items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb]"
                        >
                            <RotateCcw className="size-4" />
                            Reset
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
