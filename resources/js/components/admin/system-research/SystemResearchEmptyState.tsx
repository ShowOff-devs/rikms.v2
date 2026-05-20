import { SearchX } from 'lucide-react';

export function SystemResearchEmptyState({
    onResetFilters,
}: {
    onResetFilters: () => void;
}) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#1e3a8a]">
                <SearchX className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-[#1e2939]">
                No research records found
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-[#6a7282]">
                Adjust the search term or filter selection to return system-wide
                research records.
            </p>
            <button
                type="button"
                onClick={onResetFilters}
                className="mt-4 h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
            >
                Reset Filters
            </button>
        </div>
    );
}
