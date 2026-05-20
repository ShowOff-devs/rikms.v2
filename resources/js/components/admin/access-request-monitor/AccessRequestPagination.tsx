import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccessRequestPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
};

export function AccessRequestPagination({
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
}: AccessRequestPaginationProps) {
    const start = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalResults);

    return (
        <div className="flex min-h-[56px] flex-col gap-3 border-t border-[#f3f4f6] px-6 py-4 text-xs text-[#99a1af] sm:flex-row sm:items-center sm:justify-between">
            <p>
                Showing {start}-{end} of {totalResults} requests
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="flex size-8 items-center justify-center rounded-[8px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(0, 5)
                    .map((page) => (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-[8px] text-xs font-semibold transition',
                                page === currentPage
                                    ? 'bg-[#1e3a8a] text-white'
                                    : 'text-[#6a7282] hover:bg-[#f9fafb]',
                            )}
                        >
                            {page}
                        </button>
                    ))}
                <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="flex size-8 items-center justify-center rounded-[8px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
