import { Search } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    moderationIssueTypeLabels,
    moderationStatusLabels,
} from '@/data/research-moderation-options';
import type {
    ModerationFilters as ModerationFiltersType,
    ModerationIssueType,
    ModerationStatus,
} from '@/types/research-moderation';

type ModerationFiltersProps = {
    filters: ModerationFiltersType;
    agencies: string[];
    years: string[];
    onFiltersChange: (filters: ModerationFiltersType) => void;
};

const issueTypes = Object.entries(moderationIssueTypeLabels) as Array<
    [ModerationIssueType, string]
>;

const statuses = Object.entries(moderationStatusLabels) as Array<
    [ModerationStatus, string]
>;

export function ModerationFilters({
    filters,
    agencies,
    years,
    onFiltersChange,
}: ModerationFiltersProps) {
    const updateFilter = <Key extends keyof ModerationFiltersType>(
        key: Key,
        value: ModerationFiltersType[Key],
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="border-b border-[#f3f4f6] bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                        aria-hidden="true"
                    />
                    <input
                        value={filters.search}
                        onChange={(event) =>
                            updateFilter('search', event.target.value)
                        }
                        className="h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#1e2939] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:bg-white focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search research records..."
                        aria-label="Search moderation records"
                    />
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:shrink-0">
                    <Select
                        value={filters.agency}
                        onValueChange={(value) => updateFilter('agency', value)}
                    >
                        <SelectTrigger
                            className="h-10 w-full min-w-0 overflow-hidden rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565] shadow-none xl:w-[150px]"
                            aria-label="Filter by agency"
                        >
                            <SelectValue
                                className="min-w-0 flex-1 truncate text-left"
                                placeholder="Agency"
                            />
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
                        value={filters.issueType}
                        onValueChange={(value) =>
                            updateFilter(
                                'issueType',
                                value as ModerationIssueType | 'all',
                            )
                        }
                    >
                        <SelectTrigger
                            className="h-10 w-full min-w-0 overflow-hidden rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565] shadow-none xl:w-[260px]"
                            aria-label="Filter by concern type"
                        >
                            <SelectValue
                                className="min-w-0 flex-1 truncate text-left"
                                placeholder="Concern Type"
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Concerns</SelectItem>
                            {issueTypes.map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.year}
                        onValueChange={(value) => updateFilter('year', value)}
                    >
                        <SelectTrigger
                            className="h-10 w-full min-w-0 overflow-hidden rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565] shadow-none xl:w-[125px]"
                            aria-label="Filter by publication year"
                        >
                            <SelectValue
                                className="min-w-0 flex-1 truncate text-left"
                                placeholder="Year"
                            />
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
                        value={filters.status}
                        onValueChange={(value) =>
                            updateFilter(
                                'status',
                                value as ModerationStatus | 'all',
                            )
                        }
                    >
                        <SelectTrigger
                            className="h-10 w-full min-w-0 overflow-hidden rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565] shadow-none xl:w-[150px]"
                            aria-label="Filter by moderation status"
                        >
                            <SelectValue
                                className="min-w-0 flex-1 truncate text-left"
                                placeholder="Status"
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {statuses.map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
