import { Search, X } from 'lucide-react';
import { agencyTypeOptions } from '@/components/admin/agencies/agency-display';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type AgencyFiltersProps = {
    searchQuery: string;
    selectedType: string;
    selectedStatus: string;
    selectedUpdated: string;
    onSearchChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onUpdatedChange: (value: string) => void;
    onReset: () => void;
};

export function AgencyFilters({
    searchQuery,
    selectedType,
    selectedStatus,
    selectedUpdated,
    onSearchChange,
    onTypeChange,
    onStatusChange,
    onUpdatedChange,
    onReset,
}: AgencyFiltersProps) {
    const hasActiveFilters =
        searchQuery ||
        selectedType !== 'all' ||
        selectedStatus !== 'all' ||
        selectedUpdated !== 'all';

    return (
        <div className="grid gap-2 border-b border-[#f3f4f6] bg-white px-5 py-4 lg:grid-cols-[minmax(280px,1fr)_160px_120px_140px_auto]">
            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                    aria-hidden="true"
                />
                <input
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white pr-3 pl-9 text-sm text-[#111827] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="Search agencies..."
                />
            </div>

            <Select value={selectedType} onValueChange={onTypeChange}>
                <SelectTrigger className="h-9 w-full rounded-[8px] border-[#e5e7eb] text-xs text-[#4a5565] shadow-none">
                    <SelectValue placeholder="Agency Type" />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="all">All types</SelectItem>
                    {agencyTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9 w-full rounded-[8px] border-[#e5e7eb] text-xs text-[#4a5565] shadow-none">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
            </Select>

            <Select value={selectedUpdated} onValueChange={onUpdatedChange}>
                <SelectTrigger className="h-9 w-full rounded-[8px] border-[#e5e7eb] text-xs text-[#4a5565] shadow-none">
                    <SelectValue placeholder="Updated" />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="all">Any update</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
            </Select>

            <button
                type="button"
                onClick={onReset}
                disabled={!hasActiveFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <X className="size-3.5" aria-hidden="true" />
                Reset
            </button>
        </div>
    );
}
