import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ArchivePaginationProps = {
    currentPage: number;
    totalPages: number;
    rowsPerPage: number;
    totalItems: number;
    startItem: number;
    endItem: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
};

const rowsPerPageOptions = [5, 10, 25];

export function ArchivePagination({
    currentPage,
    totalPages,
    rowsPerPage,
    totalItems,
    startItem,
    endItem,
    onPageChange,
    onRowsPerPageChange,
}: ArchivePaginationProps) {
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <div className="flex min-h-[61px] flex-col gap-3 border-t border-[#f3f4f6] px-4 py-3 text-xs text-[#6a7282] sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div className="flex flex-wrap items-center gap-2">
                <span>Rows per page:</span>
                <select
                    value={rowsPerPage}
                    onChange={(event) =>
                        onRowsPerPageChange(Number(event.target.value))
                    }
                    className="h-[27px] rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-2 text-xs text-[#4a5565] outline-none focus:border-[#1e3a8a]"
                    aria-label="Rows per page"
                >
                    {rowsPerPageOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <span>
                    {startItem}-{endItem} of {totalItems}
                </span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs text-[#6a7282] enabled:hover:text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <ChevronLeft className="size-3.5" />
                    Previous
                </button>
                {pages.map((page) => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        className={cn(
                            'flex size-8 items-center justify-center rounded-[10px] text-xs',
                            page === currentPage
                                ? 'bg-[#1e3a8a] font-semibold text-white'
                                : 'border border-[#e5e7eb] bg-white text-[#4a5565] hover:text-[#1e3a8a]',
                        )}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </button>
                ))}
                <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs text-[#1e2939] enabled:hover:text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                    <ChevronRight className="size-3.5" />
                </button>
            </div>
        </div>
    );
}
