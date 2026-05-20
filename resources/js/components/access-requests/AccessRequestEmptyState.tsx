import { SearchX } from 'lucide-react';

export function AccessRequestEmptyState() {
    return (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#f9fafb] text-[#99a1af]">
                <SearchX className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#1e2939]">
                No access requests found
            </p>
            <p className="mt-1 max-w-[340px] text-sm leading-5 text-[#6a7282]">
                Adjust the search term or filters to see more request records.
            </p>
        </div>
    );
}
