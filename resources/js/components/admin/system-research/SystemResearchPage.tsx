import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    exportSystemResearchRecords,
    getSystemResearchRecords,
} from '@/lib/admin/system-research-service';
import { apiMessage } from '@/lib/api-client';
import type {
    SystemResearchExportOptions,
    SystemResearchFilterOptions,
    SystemResearchFilters,
    SystemResearchRecord,
    SystemResearchSummary,
} from '@/types/system-research';
import { ExportRecordsModal } from './ExportRecordsModal';
import { SystemResearchHeader } from './SystemResearchHeader';
import { SystemResearchList } from './SystemResearchList';
import { SystemResearchStats } from './SystemResearchStats';
import { SystemResearchViewModal } from './SystemResearchViewModal';

const rowsPerPage = 10;

const initialFilters: SystemResearchFilters = {
    search: '',
    agency: 'all',
    status: 'all',
    year: 'all',
    category: 'all',
    sdg: 'all',
    documentType: 'all',
};

function initialFiltersFromLocation(): SystemResearchFilters {
    if (typeof window === 'undefined') {
        return initialFilters;
    }

    const params = new URLSearchParams(window.location.search);

    return {
        ...initialFilters,
        agency:
            params.get('agency') ??
            params.get('agency_id') ??
            initialFilters.agency,
        status: params.get('status') ?? initialFilters.status,
        year: params.get('year') ?? initialFilters.year,
        category: params.get('category') ?? initialFilters.category,
        search: params.get('search') ?? initialFilters.search,
    };
}

const emptySummary: SystemResearchSummary = {
    totalRecords: 0,
    published: 0,
    underReview: 0,
    totalViews: 0,
};

const emptyFilterOptions: SystemResearchFilterOptions = {
    agencies: [],
    years: [],
    categories: [],
    sdgs: [],
};

export function SystemResearchPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [filters, setFilters] = useState<SystemResearchFilters>(
        initialFiltersFromLocation,
    );
    const [records, setRecords] = useState<SystemResearchRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] =
        useState<SystemResearchRecord | null>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [summary, setSummary] = useState<SystemResearchSummary>(emptySummary);
    const [filterOptions, setFilterOptions] =
        useState<SystemResearchFilterOptions>(emptyFilterOptions);

    useEffect(() => {
        let isCurrent = true;
        const search = [filters.search, topbarSearch]
            .filter(Boolean)
            .join(' ')
            .trim();
        const timeout = window.setTimeout(() => {
            setIsLoading(true);

            getSystemResearchRecords(
                { ...filters, search },
                currentPage,
                rowsPerPage,
            )
                .then((result) => {
                    if (!isCurrent) {
                        return;
                    }

                    setRecords(result.records);
                    setTotalPages(Math.max(1, result.pagination.last_page));
                    setTotalResults(result.pagination.total);
                    setSummary(result.summary);
                    setFilterOptions(result.filterOptions);
                    setError(null);
                })
                .catch((caughtError: unknown) => {
                    if (isCurrent) {
                        setError(
                            apiMessage(
                                caughtError,
                                'Unable to load system research records.',
                            ),
                        );
                    }
                })
                .finally(() => {
                    if (isCurrent) {
                        setIsLoading(false);
                    }
                });
        }, 250);

        return () => {
            isCurrent = false;
            window.clearTimeout(timeout);
        };
    }, [currentPage, filters, topbarSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, topbarSearch]);

    useEffect(() => {
        if (!feedback) {
            return undefined;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 3800);

        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const effectiveCurrentPage = Math.min(currentPage, totalPages);

    const hasActiveFilters =
        Boolean(filters.search?.trim()) ||
        Boolean(topbarSearch.trim()) ||
        filters.agency !== 'all' ||
        filters.status !== 'all' ||
        filters.year !== 'all' ||
        filters.category !== 'all' ||
        filters.sdg !== 'all' ||
        filters.documentType !== 'all';

    const resetFilters = () => {
        setFilters(initialFilters);
        setTopbarSearch('');
    };

    const handleExport = async (options: SystemResearchExportOptions) => {
        setIsExporting(true);

        try {
            const result = await exportSystemResearchRecords(options, {
                ...filters,
                search: [filters.search, topbarSearch]
                    .filter(Boolean)
                    .join(' ')
                    .trim(),
            });
            setFeedback(`${result.fileName} was downloaded.`);
            setIsExportOpen(false);
            setError(null);
        } catch (caughtError: unknown) {
            setError(
                apiMessage(
                    caughtError,
                    'Unable to export system research records.',
                ),
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <div className="mx-auto flex max-w-[1230px] flex-col gap-6">
                    <SystemResearchHeader
                        onExport={() => setIsExportOpen(true)}
                    />

                    {error ? (
                        <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                            {error}
                        </div>
                    ) : null}

                    {feedback ? (
                        <div
                            role="status"
                            className="rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]"
                        >
                            {feedback}
                        </div>
                    ) : null}

                    <SystemResearchStats
                        summary={summary}
                        isLoading={isLoading}
                    />

                    <SystemResearchList
                        records={records}
                        isLoading={isLoading}
                        currentPage={effectiveCurrentPage}
                        totalPages={totalPages}
                        totalResults={totalResults}
                        rowsPerPage={rowsPerPage}
                        filters={filters}
                        agencies={filterOptions.agencies}
                        years={filterOptions.years}
                        categories={filterOptions.categories}
                        sdgs={filterOptions.sdgs}
                        hasActiveFilters={hasActiveFilters}
                        onFiltersChange={setFilters}
                        onResetFilters={resetFilters}
                        onPageChange={(page) =>
                            setCurrentPage(
                                Math.min(Math.max(page, 1), totalPages),
                            )
                        }
                        onView={setSelectedRecord}
                        onOpen={(record) =>
                            router.visit(`/admin/research/${record.id}`)
                        }
                    />
                </div>
            </main>

            <SystemResearchViewModal
                record={selectedRecord}
                open={Boolean(selectedRecord)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedRecord(null);
                    }
                }}
            />

            <ExportRecordsModal
                open={isExportOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportOpen}
                onExport={handleExport}
            />
        </AdminLayout>
    );
}
