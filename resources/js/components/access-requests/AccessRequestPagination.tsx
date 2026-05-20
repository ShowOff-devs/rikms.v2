import { ChevronLeft, ChevronRight } from 'lucide-react';

type AccessRequestPaginationProps = {
    currentPage: number;
    totalPages: number;
    rowsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
};

const rowsPerPageOptions = [5, 10, 25];

export function AccessRequestPagination({
    currentPage,
    totalPages,
    rowsPerPage,
    totalItems,
    onPageChange,
    onRowsPerPageChange,
}: AccessRequestPaginationProps) {
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <div className="flex min-h-[57px] flex-col gap-3 border-t border-[#f3f4f6] px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[#6a7282]">
                <span>Rows per page:</span>
                <select
                    value={rowsPerPage}
                    onChange={(event) =>
                        onRowsPerPageChange(Number(event.target.value))
                    }
                    className="h-[27px] rounded-[4px] border border-[#e5e7eb] bg-[#f9fafb] px-2 text-xs text-[#4a5565] outline-none focus:border-[#1e3a8a]"
                    aria-label="Rows per page"
                >
                    {rowsPerPageOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <span className="text-[#99a1af]">{totalItems} total</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex size-7 items-center justify-center rounded-[8px] text-[#4a5565] enabled:hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5dc]"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-4" />
                </button>
                {pages.map((page) => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        className={`flex size-8 items-center justify-center rounded-[8px] text-xs ${
                            page === currentPage
                                ? 'bg-[#1e3a8a] font-semibold text-white'
                                : 'text-[#4a5565] hover:bg-[#f3f4f6]'
                        }`}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex size-7 items-center justify-center rounded-[8px] text-[#4a5565] enabled:hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5dc]"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </div>
    );
}
