import { ArchiveX } from 'lucide-react';

type ArchiveEmptyStateProps = {
    onClearFilters: () => void;
};

export function ArchiveEmptyState({ onClearFilters }: ArchiveEmptyStateProps) {
    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                <ArchiveX className="size-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-[#1e2939]">
                No archived research found
            </h2>
            <p className="mt-1 max-w-[420px] text-sm leading-5 text-[#6a7282]">
                Try another search term or reset the filters to review every
                archived agency record.
            </p>
            <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 h-9 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#172f73]"
            >
                Reset filters
            </button>
        </div>
    );
}
