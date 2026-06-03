import { Filter, Search, X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    systemResearchDocumentTypeLabels,
    systemResearchStatusLabels,
} from '@/data/system-research-options';
import type { SystemResearchFilters as SystemResearchFilterState } from '@/types/system-research';

type SystemResearchFiltersProps = {
    filters: SystemResearchFilterState;
    agencies: string[];
    years: string[];
    categories: string[];
    sdgs: string[];
    hasActiveFilters: boolean;
    onFiltersChange: (filters: SystemResearchFilterState) => void;
    onReset: () => void;
};

function filterValue(value?: string) {
    return value && value.length > 0 ? value : 'all';
}

export function SystemResearchFilters({
    filters,
    agencies,
    years,
    categories,
    sdgs,
    hasActiveFilters,
    onFiltersChange,
    onReset,
}: SystemResearchFiltersProps) {
    const updateFilter = (
        key: keyof SystemResearchFilterState,
        value: string,
    ) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    return (
        <div className="border-b border-[#f3f4f6] bg-white px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                        aria-hidden="true"
                    />
                    <input
                        value={filters.search ?? ''}
                        onChange={(event) =>
                            updateFilter('search', event.target.value)
                        }
                        className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#1e2939] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search research titles, authors..."
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Filter
                        className="hidden size-4 text-[#99a1af] md:block"
                        aria-hidden="true"
                    />

                    <Select
                        value={filterValue(filters.agency)}
                        onValueChange={(value) => updateFilter('agency', value)}
                    >
                        <SelectTrigger className="h-[37px] w-[134px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
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
                        value={filterValue(filters.status)}
                        onValueChange={(value) => updateFilter('status', value)}
                    >
                        <SelectTrigger className="h-[37px] w-[150px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {Object.entries(systemResearchStatusLabels).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterValue(filters.year)}
                        onValueChange={(value) => updateFilter('year', value)}
                    >
                        <SelectTrigger className="h-[37px] w-[112px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {years.map((year) => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterValue(filters.category)}
                        onValueChange={(value) =>
                            updateFilter('category', value)
                        }
                    >
                        <SelectTrigger className="h-[37px] w-[168px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterValue(filters.sdg)}
                        onValueChange={(value) => updateFilter('sdg', value)}
                    >
                        <SelectTrigger className="h-[37px] w-[180px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                            <SelectValue placeholder="SDG" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All SDGs</SelectItem>
                            {sdgs.map((sdg) => (
                                <SelectItem key={sdg} value={sdg}>
                                    {sdg}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterValue(filters.documentType)}
                        onValueChange={(value) =>
                            updateFilter('documentType', value)
                        }
                    >
                        <SelectTrigger className="h-[37px] w-[190px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#4a5565] shadow-none">
                            <SelectValue placeholder="Document Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Documents</SelectItem>
                            {Object.entries(
                                systemResearchDocumentTypeLabels,
                            ).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={onReset}
                            className="flex size-[37px] items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-white text-[#6a7282] transition hover:bg-[#f9fafb] hover:text-[#1e2939]"
                            aria-label="Clear filters"
                            title="Clear filters"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
