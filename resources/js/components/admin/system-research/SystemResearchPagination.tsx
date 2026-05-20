import { ChevronLeft, ChevronRight } from 'lucide-react';

type SystemResearchPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
};

function getVisiblePages(totalPages: number) {
    return Array.from({ length: totalPages }, (_, index) => index + 1).slice(
        0,
        5,
    );
}

export function SystemResearchPagination({
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
}: SystemResearchPaginationProps) {
    const start = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalResults);

    return (
        <div className="flex flex-col gap-3 border-t border-[#f3f4f6] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-4 text-[#99a1af]">
                Showing {start}
                {totalResults > 0 ? `-${end}` : ''} of {totalResults} research
                records
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex size-8 items-center justify-center rounded-[10px] text-[#6a7282] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                    title="Previous page"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                {getVisiblePages(totalPages).map((page) => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        className={
                            page === currentPage
                                ? 'size-8 rounded-[10px] bg-[#1e3a8a] text-xs font-semibold text-white'
                                : 'size-8 rounded-[10px] text-xs font-medium text-[#6a7282] transition hover:bg-[#f9fafb]'
                        }
                    >
                        {page}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex size-8 items-center justify-center rounded-[10px] text-[#6a7282] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                    title="Next page"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
