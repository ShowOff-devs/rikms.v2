import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
    ResearchAccessLevel,
    ResearchFacetOptions,
    ResearchFilters as ResearchFiltersType,
    ResearchFilterOption,
    ResearchStatus,
} from '@/types/research';

type ResearchFiltersProps = {
    filters: ResearchFiltersType;
    facets: ResearchFacetOptions;
    hasActiveFilters: boolean;
    onToggleFilter: (
        field: keyof Pick<
            ResearchFiltersType,
            | 'agencies'
            | 'categories'
            | 'sdgs'
            | 'years'
            | 'accessLevels'
            | 'statuses'
        >,
        value: string | number,
    ) => void;
    onYearRangeChange: (field: 'yearFrom' | 'yearTo', value: number) => void;
    onClearFilters: () => void;
};

type FilterSectionProps = {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
};

function FilterSection({
    title,
    children,
    defaultOpen = true,
}: FilterSectionProps) {
    return (
        <details
            className="group border-b border-[#f3f4f6] py-4 first:pt-0 last:border-b-0"
            open={defaultOpen}
        >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm leading-5 font-semibold text-[#1e3a8a] [&::-webkit-details-marker]:hidden">
                {title}
                <span className="group-open:hidden">
                    <ChevronDown className="size-4 text-[#6b7280]" />
                </span>
                <span className="hidden group-open:block">
                    <ChevronUp className="size-4 text-[#6b7280]" />
                </span>
            </summary>
            <div className="mt-2">{children}</div>
        </details>
    );
}

function optionLabel(value: string) {
    if (value === 'public') {
        return 'Public';
    }

    if (value === 'restricted') {
        return 'Restricted';
    }

    if (value === 'published') {
        return 'Published';
    }

    if (value === 'archived') {
        return 'Archived';
    }

    return value;
}

function CheckboxOption({
    option,
    checked,
    onChange,
    showCount = true,
}: {
    option: ResearchFilterOption;
    checked: boolean;
    onChange: () => void;
    showCount?: boolean;
}) {
    return (
        <label className="flex min-h-5 cursor-pointer items-center gap-2 text-sm leading-5 text-[#6b7280]">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="size-[13px] rounded-[3px] border-[#d1d5db] text-[#1e3a8a] focus:ring-[#1e3a8a]"
            />
            {option.color ? (
                <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                />
            ) : null}
            <span className="min-w-0 flex-1 truncate">
                {optionLabel(option.label)}
            </span>
            {showCount ? (
                <span className="text-xs leading-4 text-[#99a1af]">
                    {option.count}
                </span>
            ) : null}
        </label>
    );
}

export default function ResearchFilters({
    filters,
    facets,
    hasActiveFilters,
    onToggleFilter,
    onYearRangeChange,
    onClearFilters,
}: ResearchFiltersProps) {
    return (
        <aside className="w-full shrink-0 rounded-[14px] border border-[#f3f4f6] bg-white px-[21px] pt-[21px] pb-px shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] lg:w-64">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                    Filters
                </h2>
                {hasActiveFilters ? (
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="text-xs leading-4 font-medium text-[#1e3a8a] hover:underline"
                    >
                        Clear all
                    </button>
                ) : null}
            </div>

            <div className="mt-4">
                <FilterSection title="SDG">
                    <div className="space-y-1.5">
                        {facets.sdgs.map((option) => (
                            <CheckboxOption
                                key={option.value}
                                option={option}
                                checked={filters.sdgs.includes(option.value)}
                                onChange={() =>
                                    onToggleFilter('sdgs', option.value)
                                }
                                showCount={false}
                            />
                        ))}
                    </div>
                </FilterSection>

                <FilterSection title="Agency">
                    <div className="space-y-1.5">
                        {facets.agencies.map((option) => (
                            <CheckboxOption
                                key={option.value}
                                option={option}
                                checked={filters.agencies.includes(
                                    option.value,
                                )}
                                onChange={() =>
                                    onToggleFilter('agencies', option.value)
                                }
                            />
                        ))}
                    </div>
                </FilterSection>

                <FilterSection title="Publication Year">
                    <div className="space-y-1.5">
                        {facets.years.map((option) => (
                            <CheckboxOption
                                key={option.value}
                                option={option}
                                checked={filters.years.includes(
                                    Number(option.value),
                                )}
                                onChange={() =>
                                    onToggleFilter(
                                        'years',
                                        Number(option.value),
                                    )
                                }
                                showCount={false}
                            />
                        ))}
                    </div>

                    <div className="mt-4 border-t border-[#f3f4f6] pt-3">
                        <p className="text-xs leading-4 font-semibold text-[#1e3a8a]">
                            Custom Range
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                            <label className="w-[96px]">
                                <span className="text-xs leading-4 text-[#6b7280]">
                                    From
                                </span>
                                <input
                                    type="number"
                                    min={facets.minYear}
                                    max={facets.maxYear}
                                    value={filters.yearFrom}
                                    onChange={(event) =>
                                        onYearRangeChange(
                                            'yearFrom',
                                            Number(event.target.value),
                                        )
                                    }
                                    className="mt-1 h-[34px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-2 text-sm text-[#0a0a0a] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                />
                            </label>
                            <span className="pb-2 text-xs leading-4 text-[#6b7280]">
                                -
                            </span>
                            <label className="w-[96px]">
                                <span className="text-xs leading-4 text-[#6b7280]">
                                    To
                                </span>
                                <input
                                    type="number"
                                    min={facets.minYear}
                                    max={facets.maxYear}
                                    value={filters.yearTo}
                                    onChange={(event) =>
                                        onYearRangeChange(
                                            'yearTo',
                                            Number(event.target.value),
                                        )
                                    }
                                    className="mt-1 h-[34px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-2 text-sm text-[#0a0a0a] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                />
                            </label>
                        </div>
                        <div className="mt-3 px-0.5">
                            <div className="flex items-center justify-between text-xs leading-4 text-[#99a1af]">
                                <span>{facets.minYear}</span>
                                <span>{facets.maxYear}</span>
                            </div>
                            <div className="mt-1 h-1 rounded-full bg-[#1e3a8a]" />
                        </div>
                    </div>
                </FilterSection>

                <FilterSection title="Research Category">
                    <div className="space-y-1.5">
                        {facets.categories.map((option) => (
                            <CheckboxOption
                                key={option.value}
                                option={option}
                                checked={filters.categories.includes(
                                    option.value,
                                )}
                                onChange={() =>
                                    onToggleFilter('categories', option.value)
                                }
                            />
                        ))}
                    </div>
                </FilterSection>

                <FilterSection title="Access Type" defaultOpen={false}>
                    <div className="space-y-1.5">
                        {facets.accessLevels.map((option) => (
                            <CheckboxOption
                                key={option.value}
                                option={option}
                                checked={filters.accessLevels.includes(
                                    option.value as ResearchAccessLevel,
                                )}
                                onChange={() =>
                                    onToggleFilter('accessLevels', option.value)
                                }
                            />
                        ))}
                    </div>
                </FilterSection>

                <FilterSection title="Status" defaultOpen={false}>
                    <div className="space-y-1.5">
                        {facets.statuses.map((option) => (
                            <CheckboxOption
                                key={option.value}
                                option={option}
                                checked={filters.statuses.includes(
                                    option.value as ResearchStatus,
                                )}
                                onChange={() =>
                                    onToggleFilter('statuses', option.value)
                                }
                            />
                        ))}
                    </div>
                </FilterSection>
            </div>
        </aside>
    );
}
