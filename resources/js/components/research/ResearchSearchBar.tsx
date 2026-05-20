import { Search } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ResearchSortKey } from '@/types/research';

type ResearchSearchBarProps = {
    search: string;
    sort: ResearchSortKey;
    total: number;
    isLoading: boolean;
    onSearchChange: (value: string) => void;
    onSortChange: (value: ResearchSortKey) => void;
};

const sortOptions: Array<{ value: ResearchSortKey; label: string }> = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'agency', label: 'Agency A-Z' },
];

export default function ResearchSearchBar({
    search,
    sort,
    total,
    isLoading,
    onSearchChange,
    onSortChange,
}: ResearchSearchBarProps) {
    return (
        <div className="rounded-[14px] border border-[#f3f4f6] bg-white px-[17px] pt-[17px] pb-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search within results..."
                        className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#111827] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </div>
                <Select value={sort} onValueChange={onSortChange}>
                    <SelectTrigger className="h-[38px] w-full rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] text-sm shadow-none sm:w-[167px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                        {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <p className="mt-2 text-xs leading-4 text-[#6b7280]">
                {isLoading
                    ? 'Loading research records...'
                    : `Showing ${new Intl.NumberFormat('en-US').format(total)} result${total === 1 ? '' : 's'}`}
            </p>
        </div>
    );
}
