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
} from '@/data/mock-research-moderation';
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
        <div className="grid gap-2 border-b border-[#f3f4f6] bg-white p-5 lg:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(130px,176px))]">
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
                    className="h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white pr-3 pl-9 text-sm text-[#1e2939] outline-none transition placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="Search research records..."
                />
            </div>

            <Select
                value={filters.agency}
                onValueChange={(value) => updateFilter('agency', value)}
            >
                <SelectTrigger className="h-10 rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
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
                value={filters.issueType}
                onValueChange={(value) =>
                    updateFilter(
                        'issueType',
                        value as ModerationIssueType | 'all',
                    )
                }
            >
                <SelectTrigger className="h-10 rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
                    <SelectValue placeholder="Issue Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Issues</SelectItem>
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
                <SelectTrigger className="h-10 rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
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
                value={filters.status}
                onValueChange={(value) =>
                    updateFilter('status', value as ModerationStatus | 'all')
                }
            >
                <SelectTrigger className="h-10 rounded-[10px] border-[#e5e7eb] text-[#4a5565]">
                    <SelectValue placeholder="Status" />
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
    );
}
