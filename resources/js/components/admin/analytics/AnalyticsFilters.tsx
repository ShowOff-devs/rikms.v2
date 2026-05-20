import { ChevronUp, Filter, RotateCcw } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    SystemAnalyticsFilterOptions,
    SystemAnalyticsFilters,
} from '@/types/system-analytics';

const allValue = 'all';

const filterLabels: Record<keyof SystemAnalyticsFilters, string> = {
    agency: 'Agency',
    publicationYear: 'Publication Year',
    researchCategory: 'Research Category',
    sdg: 'SDG',
    documentType: 'Document Type',
    accessType: 'Access Type',
    status: 'Status',
};

function toSelectValue(value?: string) {
    return value ?? allValue;
}

function toFilterValue(value: string) {
    return value === allValue ? undefined : value;
}

function titleCaseStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function FilterSelect({
    id,
    label,
    value,
    placeholder,
    options,
    onChange,
}: {
    id: keyof SystemAnalyticsFilters;
    label: string;
    value?: string;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
    onChange: (key: keyof SystemAnalyticsFilters, value?: string) => void;
}) {
    return (
        <div className="min-w-0">
            <label className="text-[10px] leading-[15px] font-semibold tracking-[0.5px] text-[#99a1af] uppercase">
                {label}
            </label>
            <Select
                value={toSelectValue(value)}
                onValueChange={(nextValue) =>
                    onChange(id, toFilterValue(nextValue))
                }
            >
                <SelectTrigger className="mt-1 h-[37px] w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#364153] shadow-none">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent align="start">
                    <SelectItem value={allValue}>{placeholder}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function AnalyticsFilters({
    filters,
    options,
    onFiltersChange,
    onClearFilters,
}: {
    filters: SystemAnalyticsFilters;
    options: SystemAnalyticsFilterOptions;
    onFiltersChange: (filters: SystemAnalyticsFilters) => void;
    onClearFilters: () => void;
}) {
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const updateFilter = (
        key: keyof SystemAnalyticsFilters,
        value?: string,
    ) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    return (
        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-12 items-center justify-between px-5">
                <div className="flex items-center gap-2">
                    <Filter className="size-4 text-[#1e3a8a]" />
                    <h2 className="text-sm leading-5 font-semibold text-[#364153]">
                        Analytics Filters
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1e3a8a] hover:text-[#172554]"
                        >
                            <RotateCcw
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            Reset
                        </button>
                    )}
                    <ChevronUp
                        className="size-4 text-[#94a3b8]"
                        aria-hidden="true"
                    />
                </div>
            </div>

            <div className="border-t border-[#f3f4f6] px-5 pt-1.5 pb-6">
                <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-[140px_120px_151px_243px_150px_140px_120px]">
                    <FilterSelect
                        id="agency"
                        label={filterLabels.agency}
                        value={filters.agency}
                        placeholder="All agencies"
                        options={options.agencies.map((agency) => ({
                            value: agency,
                            label: agency,
                        }))}
                        onChange={updateFilter}
                    />
                    <FilterSelect
                        id="publicationYear"
                        label={filterLabels.publicationYear}
                        value={filters.publicationYear}
                        placeholder="All years"
                        options={options.publicationYears.map((year) => ({
                            value: year,
                            label: year,
                        }))}
                        onChange={updateFilter}
                    />
                    <FilterSelect
                        id="researchCategory"
                        label={filterLabels.researchCategory}
                        value={filters.researchCategory}
                        placeholder="All categories"
                        options={options.researchCategories.map((category) => ({
                            value: category,
                            label: category,
                        }))}
                        onChange={updateFilter}
                    />
                    <FilterSelect
                        id="sdg"
                        label={filterLabels.sdg}
                        value={filters.sdg}
                        placeholder="All SDGs"
                        options={options.sdgs}
                        onChange={updateFilter}
                    />
                    <FilterSelect
                        id="documentType"
                        label={filterLabels.documentType}
                        value={filters.documentType}
                        placeholder="All types"
                        options={options.documentTypes.map((documentType) => ({
                            value: documentType,
                            label: documentType,
                        }))}
                        onChange={updateFilter}
                    />
                    <FilterSelect
                        id="accessType"
                        label={filterLabels.accessType}
                        value={filters.accessType}
                        placeholder="All access"
                        options={options.accessTypes.map((accessType) => ({
                            value: accessType,
                            label: accessType,
                        }))}
                        onChange={updateFilter}
                    />
                    <FilterSelect
                        id="status"
                        label={filterLabels.status}
                        value={filters.status}
                        placeholder="All statuses"
                        options={options.statuses.map((status) => ({
                            value: status,
                            label: titleCaseStatus(status),
                        }))}
                        onChange={updateFilter}
                    />
                </div>
            </div>
        </section>
    );
}
