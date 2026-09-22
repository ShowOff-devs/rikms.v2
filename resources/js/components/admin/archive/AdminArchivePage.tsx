import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    createArchiveActivity,
    exportArchiveReport,
    getAdminArchiveSummary,
    getArchiveFilterOptions,
    getArchiveActivityTimeline,
    getArchivedRecordsPage,
    permanentlyDeleteArchivedRecord,
    restoreArchivedRecord,
} from '@/lib/admin/archive-service';
import type {
    AdminArchiveFilters,
    AdminArchiveSummary,
    AdminArchivedRecord,
    ArchiveActivity,
    ArchiveExportOptions,
    ArchiveRecordType,
} from '@/types/admin-archive';
import { AdminArchiveHeader } from './AdminArchiveHeader';
import { getArchivedRecordTitle } from './archive-record-display';
import { ArchiveActivityTimeline } from './ArchiveActivityTimeline';
import { ArchiveFilters } from './ArchiveFilters';
import { ArchiveSummaryCards } from './ArchiveSummaryCards';
import { ArchiveTable } from './ArchiveTable';
import { ArchiveTabs } from './ArchiveTabs';
import { DeleteArchivedRecordModal } from './DeleteArchivedRecordModal';
import { ExportArchiveReportModal } from './ExportArchiveReportModal';
import { RestoreArchivedRecordModal } from './RestoreArchivedRecordModal';
import { ViewArchivedRecordModal } from './ViewArchivedRecordModal';

const rowsPerPage = 8;

const initialFilters: AdminArchiveFilters = {
    search: '',
    agency: 'all',
    date: 'all',
    status: 'all',
    recordType: 'all',
};

export function AdminArchivePage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [summary, setSummary] = useState<AdminArchiveSummary | null>(null);
    const [records, setRecords] = useState<AdminArchivedRecord[]>([]);
    const [agencies, setAgencies] = useState<string[]>([]);
    const [activities, setActivities] = useState<ArchiveActivity[]>([]);
    const [activityPage, setActivityPage] = useState(1);
    const [activityLastPage, setActivityLastPage] = useState(1);
    const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
    const [activeTab, setActiveTab] = useState<ArchiveRecordType>('research');
    const [filters, setFilters] = useState<AdminArchiveFilters>(initialFilters);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecordsLoading, setIsRecordsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [selectedViewRecord, setSelectedViewRecord] =
        useState<AdminArchivedRecord | null>(null);
    const [selectedRestoreRecord, setSelectedRestoreRecord] =
        useState<AdminArchivedRecord | null>(null);
    const [selectedDeleteRecord, setSelectedDeleteRecord] =
        useState<AdminArchivedRecord | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getAdminArchiveSummary(),
            getArchiveFilterOptions(),
            getArchiveActivityTimeline(),
        ])
            .then(([loadedSummary, loadedAgencies, loadedActivities]) => {
                if (!isCurrent) {
                    return;
                }

                setSummary(loadedSummary);
                setAgencies(loadedAgencies);
                setActivities(loadedActivities.activities);
                setActivityPage(loadedActivities.currentPage);
                setActivityLastPage(loadedActivities.lastPage);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load archive and recovery data.');
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
        let isCurrent = true;
        setIsRecordsLoading(true);

        const timerId = window.setTimeout(() => {
            getArchivedRecordsPage(activeTab, {
                page: currentPage,
                perPage: rowsPerPage,
                filters,
                topbarSearch,
            })
                .then((result) => {
                    if (!isCurrent) {
                        return;
                    }

                    setRecords(result.records);
                    setTotalPages(result.lastPage);
                    setTotalResults(result.total);

                    if (currentPage > result.lastPage) {
                        setCurrentPage(Math.max(1, result.lastPage));
                    }

                    setError(null);
                })
                .catch(() => {
                    if (isCurrent) {
                        setError('Unable to load archived records.');
                    }
                })
                .finally(() => {
                    if (isCurrent) {
                        setIsRecordsLoading(false);
                    }
                });
        }, 250);

        return () => {
            isCurrent = false;
            window.clearTimeout(timerId);
        };
    }, [activeTab, currentPage, filters, topbarSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filters, topbarSearch]);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => setFeedback(null), 3400);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    const hasActiveFilters =
        Boolean(filters.search.trim()) ||
        Boolean(topbarSearch.trim()) ||
        filters.agency !== 'all' ||
        filters.date !== 'all' ||
        filters.status !== 'all' ||
        filters.recordType !== 'all';

    const removeRecordFromState = (record: AdminArchivedRecord) => {
        setRecords((current) =>
            current.filter((item) => item.id !== record.id),
        );
        setTotalResults((current) => Math.max(0, current - 1));
        setSummary((current) => {
            if (!current) {
                return current;
            }

            const field = {
                research: 'archivedResearchRecords',
                file: 'archivedFiles',
                agency: 'archivedAgencies',
                user: 'archivedUserAccounts',
            }[record.type] as keyof AdminArchiveSummary;

            return {
                ...current,
                [field]: Math.max(0, current[field] - 1),
            };
        });
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
        setTopbarSearch('');
    };

    const handleViewRecord = (record: AdminArchivedRecord) => {
        setSelectedViewRecord(record);
        setIsViewModalOpen(true);
    };

    const handleConfirmRestore = async () => {
        if (!selectedRestoreRecord) {
            return;
        }

        setIsRestoring(true);

        try {
            await restoreArchivedRecord(
                selectedRestoreRecord.type,
                selectedRestoreRecord.id,
            );
            removeRecordFromState(selectedRestoreRecord);
            setSummary((current) =>
                current
                    ? {
                          ...current,
                          recentlyRestored: current.recentlyRestored + 1,
                      }
                    : current,
            );
            setActivities((current) => [
                createArchiveActivity('record-restored', selectedRestoreRecord),
                ...current,
            ]);
            setFeedback(
                `${getArchivedRecordTitle(selectedRestoreRecord)} was restored to its active module.`,
            );
            setSelectedRestoreRecord(null);
            setError(null);
        } catch (restoreError) {
            setError(
                restoreError instanceof Error
                    ? restoreError.message
                    : 'Unable to restore archived record.',
            );
        } finally {
            setIsRestoring(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedDeleteRecord) {
            return;
        }

        setIsDeleting(true);

        try {
            await permanentlyDeleteArchivedRecord(
                selectedDeleteRecord.type,
                selectedDeleteRecord.id,
            );
            removeRecordFromState(selectedDeleteRecord);
            setActivities((current) => [
                createArchiveActivity(
                    'record-permanently-deleted',
                    selectedDeleteRecord,
                ),
                ...current,
            ]);
            setFeedback(
                `${getArchivedRecordTitle(selectedDeleteRecord)} was permanently deleted.`,
            );
            setSelectedDeleteRecord(null);
            setError(null);
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Unable to delete archived record.',
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExport = async (options: ArchiveExportOptions) => {
        setIsExporting(true);

        try {
            const exportResult = await exportArchiveReport(options);
            setFeedback(`${exportResult.fileName} is ready for download.`);
            setIsExportModalOpen(false);
        } catch (exportError) {
            setError(
                exportError instanceof Error
                    ? exportError.message
                    : 'Archive report export is not configured for production.',
            );
        } finally {
            setIsExporting(false);
        }
    };

    const handleLoadMoreActivity = async () => {
        if (activityPage >= activityLastPage || isLoadingMoreActivity) {
            return;
        }

        setIsLoadingMoreActivity(true);

        try {
            const result = await getArchiveActivityTimeline(activityPage + 1);
            setActivities((current) => [
                ...current,
                ...result.activities.filter(
                    (activity) =>
                        !current.some((item) => item.id === activity.id),
                ),
            ]);
            setActivityPage(result.currentPage);
            setActivityLastPage(result.lastPage);
        } catch {
            setError('Unable to load older archive activity.');
        } finally {
            setIsLoadingMoreActivity(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <AdminArchiveHeader
                    onExport={() => setIsExportModalOpen(true)}
                />

                {error && (
                    <div className="mt-6 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                        {error}
                    </div>
                )}

                {feedback && (
                    <div
                        role="status"
                        className="mt-6 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]"
                    >
                        {feedback}
                    </div>
                )}

                <ArchiveSummaryCards summary={summary} isLoading={isLoading} />

                <section className="mt-6 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                    <ArchiveTabs
                        activeTab={activeTab}
                        counts={{
                            research: summary?.archivedResearchRecords ?? 0,
                            file: summary?.archivedFiles ?? 0,
                            agency: summary?.archivedAgencies ?? 0,
                            user: summary?.archivedUserAccounts ?? 0,
                        }}
                        onTabChange={setActiveTab}
                    />
                    <ArchiveFilters
                        filters={filters}
                        agencies={agencies}
                        hasActiveFilters={hasActiveFilters}
                        onFiltersChange={setFilters}
                        onReset={handleResetFilters}
                    />
                    <ArchiveTable
                        activeTab={activeTab}
                        records={records}
                        isLoading={isRecordsLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalResults={totalResults}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(page) =>
                            setCurrentPage(
                                Math.min(Math.max(page, 1), totalPages),
                            )
                        }
                        onView={handleViewRecord}
                        onRestore={setSelectedRestoreRecord}
                        onDelete={setSelectedDeleteRecord}
                        onResetFilters={handleResetFilters}
                    />
                </section>

                <ArchiveActivityTimeline
                    activities={activities}
                    isLoading={isLoading}
                    hasMore={activityPage < activityLastPage}
                    isLoadingMore={isLoadingMoreActivity}
                    onLoadMore={handleLoadMoreActivity}
                />
            </main>

            <ViewArchivedRecordModal
                record={selectedViewRecord}
                open={isViewModalOpen}
                onOpenChange={(open) => {
                    setIsViewModalOpen(open);

                    if (!open) {
                        setSelectedViewRecord(null);
                    }
                }}
            />

            <RestoreArchivedRecordModal
                record={selectedRestoreRecord}
                open={Boolean(selectedRestoreRecord)}
                isRestoring={isRestoring}
                onOpenChange={(open) => {
                    if (!open && !isRestoring) {
                        setSelectedRestoreRecord(null);
                    }
                }}
                onConfirm={handleConfirmRestore}
            />

            <DeleteArchivedRecordModal
                record={selectedDeleteRecord}
                open={Boolean(selectedDeleteRecord)}
                isDeleting={isDeleting}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setSelectedDeleteRecord(null);
                    }
                }}
                onConfirm={handleConfirmDelete}
            />

            <ExportArchiveReportModal
                open={isExportModalOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportModalOpen}
                onExport={handleExport}
            />
        </AdminLayout>
    );
}
