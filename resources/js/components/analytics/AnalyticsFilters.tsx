import { RotateCcw } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    AnalyticsFilterOptions,
    AnalyticsFilters as AnalyticsFiltersValue,
} from '@/types/analytics';

const allValue = 'all';

type FilterDefinition = {
    id: keyof AnalyticsFiltersValue;
    label: string;
    placeholder: string;
    options: string[];
    format?: (value: string) => string;
};

export function AnalyticsFilters({
    filters,
    options,
    onFiltersChange,
    onClearFilters,
}: {
    filters: AnalyticsFiltersValue;
    options: AnalyticsFilterOptions;
    onFiltersChange: (filters: AnalyticsFiltersValue) => void;
    onClearFilters: () => void;
}) {
    const filterDefinitions: FilterDefinition[] = [
        {
            id: 'year',
            label: 'Year',
            placeholder: 'All years',
            options: options.years,
        },
        {
            id: 'documentType',
            label: 'Document Type',
            placeholder: 'All document types',
            options: options.documentTypes,
        },
        {
            id: 'category',
            label: 'Category',
            placeholder: 'All categories',
            options: options.categories,
        },
        {
            id: 'sdg',
            label: 'SDG',
            placeholder: 'All SDGs',
            options: options.sdgs,
        },
        {
            id: 'accessType',
            label: 'Access Type',
            placeholder: 'All access types',
            options: options.accessTypes,
        },
        {
            id: 'status',
            label: 'Status',
            placeholder: 'All statuses',
            options: options.statuses,
            format: titleCase,
        },
    ];

    const activeFilterCount = Object.values(filters).filter(
        (value) => value && value !== allValue,
    ).length;

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                {filterDefinitions.map((filter) => (
                    <label key={filter.id} className="min-w-0">
                        <span className="mb-1.5 block text-xs font-medium text-[#4a5565]">
                            {filter.label}
                        </span>
                        <Select
                            value={filters[filter.id] ?? allValue}
                            onValueChange={(value) =>
                                onFiltersChange({
                                    ...filters,
                                    [filter.id]: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-10 w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#1e2939] shadow-none">
                                <SelectValue placeholder={filter.placeholder} />
                            </SelectTrigger>
                            <SelectContent className="border-[#e5e7eb] bg-white">
                                <SelectItem value={allValue}>
                                    {filter.placeholder}
                                </SelectItem>
                                {filter.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {filter.format
                                            ? filter.format(option)
                                            : option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f3f4f6] pt-4">
                <p className="text-xs leading-4 text-[#6a7282]">
                    {activeFilterCount === 0
                        ? 'Showing all agency analytics'
                        : `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
                </p>
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb]"
                >
                    <RotateCcw className="size-4" />
                    Clear filters
                </button>
            </div>
        </section>
    );
}

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
