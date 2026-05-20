import type { ComponentProps } from 'react';
import type { SystemResearchRecord } from '@/types/system-research';
import { SystemResearchEmptyState } from './SystemResearchEmptyState';
import { SystemResearchFilters } from './SystemResearchFilters';
import { SystemResearchItem } from './SystemResearchItem';
import { SystemResearchPagination } from './SystemResearchPagination';

type SystemResearchListProps = {
    records: SystemResearchRecord[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    filters: ComponentProps<typeof SystemResearchFilters>['filters'];
    agencies: string[];
    years: string[];
    categories: string[];
    sdgs: string[];
    hasActiveFilters: boolean;
    onFiltersChange: ComponentProps<
        typeof SystemResearchFilters
    >['onFiltersChange'];
    onResetFilters: () => void;
    onPageChange: (page: number) => void;
    onView: (record: SystemResearchRecord) => void;
    onOpen: (record: SystemResearchRecord) => void;
};

function LoadingRows() {
    return (
        <div>
            {Array.from({ length: 6 }, (_, index) => (
                <div
                    key={index}
                    className="border-b border-[#f9fafb] px-6 py-4"
                >
                    <div className="flex justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex gap-2">
                                <span className="h-[22px] w-20 animate-pulse rounded-full bg-[#eef2f7]" />
                                <span className="h-4 w-20 animate-pulse rounded bg-[#eef2f7]" />
                            </div>
                            <div className="h-4 w-2/3 animate-pulse rounded bg-[#eef2f7]" />
                            <div className="h-3 w-1/3 animate-pulse rounded bg-[#eef2f7]" />
                            <div className="h-4 w-56 animate-pulse rounded bg-[#eef2f7]" />
                        </div>
                        <div className="hidden gap-2 md:flex">
                            <span className="h-[30px] w-[74px] animate-pulse rounded-[10px] bg-[#eef2f7]" />
                            <span className="h-[30px] w-[77px] animate-pulse rounded-[10px] bg-[#eef2f7]" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SystemResearchList({
    records,
    isLoading,
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    filters,
    agencies,
    years,
    categories,
    sdgs,
    hasActiveFilters,
    onFiltersChange,
    onResetFilters,
    onPageChange,
    onView,
    onOpen,
}: SystemResearchListProps) {
    return (
        <section className="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <SystemResearchFilters
                filters={filters}
                agencies={agencies}
                years={years}
                categories={categories}
                sdgs={sdgs}
                hasActiveFilters={hasActiveFilters}
                onFiltersChange={onFiltersChange}
                onReset={onResetFilters}
            />

            {isLoading ? (
                <LoadingRows />
            ) : records.length === 0 ? (
                <SystemResearchEmptyState onResetFilters={onResetFilters} />
            ) : (
                <div>
                    {records.map((record) => (
                        <SystemResearchItem
                            key={record.id}
                            record={record}
                            onView={onView}
                            onOpen={onOpen}
                        />
                    ))}
                </div>
            )}

            <SystemResearchPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                rowsPerPage={rowsPerPage}
                onPageChange={onPageChange}
            />
        </section>
    );
}
