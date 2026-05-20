import { BarChart3 } from 'lucide-react';

export function AnalyticsEmptyState({
    onClearFilters,
}: {
    onClearFilters: () => void;
}) {
    return (
        <div className="rounded-[14px] border border-dashed border-[#cbd5e1] bg-white px-6 py-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-[14px] bg-[#eef2ff] text-[#1e3a8a]">
                <BarChart3 className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-sm font-bold text-[#0f172a]">
                No matching analytics data
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#6a7282]">
                Adjust or clear the filters to restore the system-wide analytics
                view.
            </p>
            <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 h-9 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white hover:bg-[#172554]"
            >
                Clear filters
            </button>
        </div>
    );
}
