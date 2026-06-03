import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    createSystemResearchSummary,
    exportSystemResearchRecords,
    filterSystemResearchRecords,
    getSystemResearchRecords,
} from '@/lib/admin/system-research-service';
import type {
    SystemResearchExportOptions,
    SystemResearchFilters,
    SystemResearchRecord,
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

function uniqueSorted(values: string[]) {
    return Array.from(new Set(values)).sort((left, right) =>
        left.localeCompare(right),
    );
}

export function SystemResearchPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [filters, setFilters] =
        useState<SystemResearchFilters>(initialFilters);
    const [records, setRecords] = useState<SystemResearchRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] =
        useState<SystemResearchRecord | null>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        getSystemResearchRecords()
            .then((loadedRecords) => {
                if (!isCurrent) {
                    return;
                }

                setRecords(loadedRecords);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load system research records.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

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

    const agencies = useMemo(
        () => uniqueSorted(records.map((record) => record.agencyShortName)),
        [records],
    );

    const years = useMemo(
        () =>
            uniqueSorted(records.map((record) => String(record.year))).sort(
                (left, right) => Number(right) - Number(left),
            ),
        [records],
    );

    const categories = useMemo(
        () => uniqueSorted(records.map((record) => record.category)),
        [records],
    );

    const sdgs = useMemo(
        () => uniqueSorted(records.flatMap((record) => record.sdgs)),
        [records],
    );

    const filteredRecords = useMemo(() => {
        const filteredByControls = filterSystemResearchRecords(
            records,
            filters,
        );

        if (!topbarSearch.trim()) {
            return filteredByControls;
        }

        return filterSystemResearchRecords(filteredByControls, {
            search: topbarSearch,
        });
    }, [filters, records, topbarSearch]);

    const summary = useMemo(
        () => createSystemResearchSummary(filteredRecords),
        [filteredRecords],
    );

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRecords.length / rowsPerPage),
    );
    const effectiveCurrentPage = Math.min(currentPage, totalPages);
    const paginatedRecords = filteredRecords.slice(
        (effectiveCurrentPage - 1) * rowsPerPage,
        effectiveCurrentPage * rowsPerPage,
    );

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
            const result = await exportSystemResearchRecords(options);
            setFeedback(`${result.fileName} is ready for export workflow.`);
            setIsExportOpen(false);
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
                        records={paginatedRecords}
                        isLoading={isLoading}
                        currentPage={effectiveCurrentPage}
                        totalPages={totalPages}
                        totalResults={filteredRecords.length}
                        rowsPerPage={rowsPerPage}
                        filters={filters}
                        agencies={agencies}
                        years={years}
                        categories={categories}
                        sdgs={sdgs}
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
