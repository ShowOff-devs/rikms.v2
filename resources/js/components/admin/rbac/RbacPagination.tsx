import { ChevronLeft, ChevronRight } from 'lucide-react';

type RbacPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
};

export function RbacPagination({
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
}: RbacPaginationProps) {
    const start = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalResults);

    return (
        <div className="flex min-h-16 items-center justify-between border-t border-[#f3f4f6] px-6 py-4">
            <p className="text-xs text-[#99a1af]">
                Showing {start}-{end} of {totalResults} assignments
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="flex size-8 items-center justify-center rounded-[8px] border border-[#e5e7eb] text-[#6a7282] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous assignment page"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="text-xs font-medium text-[#4a5565]">
                    Page {currentPage} of {Math.max(1, totalPages)}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="flex size-8 items-center justify-center rounded-[8px] border border-[#e5e7eb] text-[#6a7282] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next assignment page"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
