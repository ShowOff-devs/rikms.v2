import { ArchiveX, RotateCcw } from 'lucide-react';

type ArchiveEmptyStateProps = {
    onReset: () => void;
};

export function ArchiveEmptyState({ onReset }: ArchiveEmptyStateProps) {
    return (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#f3f4f6] text-[#6a7282]">
                <ArchiveX className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[#1e2939]">
                No archived records found
            </h3>
            <p className="mt-1 max-w-md text-xs leading-5 text-[#6a7282]">
                Adjust the search or filters to review archived platform
                records.
            </p>
            <button
                type="button"
                onClick={onReset}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
            >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset Filters
            </button>
        </div>
    );
}
