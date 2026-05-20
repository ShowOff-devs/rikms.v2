import { ChevronLeft, ChevronRight } from 'lucide-react';

type AgencyPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
};

export function AgencyPagination({
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
}: AgencyPaginationProps) {
    const startResult =
        totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endResult = Math.min(currentPage * rowsPerPage, totalResults);
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <div className="flex min-h-[65px] flex-col gap-3 border-t border-[#f3f4f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-4 text-[#99a1af]">
                Showing {startResult}-{endResult} of {totalResults} agencies
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex size-7 items-center justify-center rounded-[8px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                {pages.map((page) => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        className={`flex size-8 items-center justify-center rounded-[10px] text-xs leading-4 transition ${
                            currentPage === page
                                ? 'bg-[#1e3a8a] font-semibold text-white'
                                : 'text-[#6a7282] hover:bg-[#f9fafb]'
                        }`}
                        aria-current={currentPage === page ? 'page' : undefined}
                    >
                        {page}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex size-7 items-center justify-center rounded-[8px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
