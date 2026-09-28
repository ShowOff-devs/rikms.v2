import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
};

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

export function activityPaginationItems(
    currentPage: number,
    totalPages: number,
): PaginationItem[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [
            1,
            'ellipsis-left',
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        'ellipsis-left',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'ellipsis-right',
        totalPages,
    ];
}

export function ActivityPagination({
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
}: ActivityPaginationProps) {
    const startResult =
        totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endResult = Math.min(currentPage * rowsPerPage, totalResults);
    const safeTotalPages = Math.max(1, totalPages);
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages);
    const pages = activityPaginationItems(safeCurrentPage, safeTotalPages);

    return (
        <div className="flex min-h-[65px] flex-col gap-3 border-t border-[#f3f4f6] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-4 text-[#99a1af]">
                Showing {startResult}-{endResult} of {totalResults} activities
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage <= 1}
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                {pages.map((page) =>
                    typeof page === 'number' ? (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-[10px] text-xs leading-4 transition',
                                safeCurrentPage === page
                                    ? 'bg-[#1e3a8a] font-semibold text-white'
                                    : 'text-[#6a7282] hover:bg-[#f9fafb]',
                            )}
                            aria-label={`Go to page ${page}`}
                            aria-current={
                                safeCurrentPage === page ? 'page' : undefined
                            }
                        >
                            {page}
                        </button>
                    ) : (
                        <span
                            key={page}
                            className="flex size-8 items-center justify-center text-xs text-[#99a1af]"
                            aria-hidden="true"
                        >
                            &hellip;
                        </span>
                    ),
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage >= safeTotalPages}
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#99a1af] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
