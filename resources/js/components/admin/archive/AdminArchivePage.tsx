import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    createArchiveActivity,
    exportArchiveReport,
    getAdminArchiveSummary,
    getArchiveActivityTimeline,
    getArchivedAgencyRecords,
    getArchivedResearchRecords,
    getArchivedUserRecords,
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
    ArchivedAgencyRecord,
    ArchivedResearchRecord,
    ArchivedUserRecord,
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

function normalize(value: string | number | undefined) {
    return String(value ?? '').toLowerCase();
}

function getRecordSearchValues(record: AdminArchivedRecord) {
    if (record.type === 'research') {
        return [
            record.title,
            record.agency,
            record.authors.join(' '),
            record.year,
            record.archivedBy,
            record.archiveDate,
            record.status,
        ];
    }

    if (record.type === 'agency') {
        return [
            record.name,
            record.shortName,
            record.agencyType,
            record.archivedBy,
            record.archiveDate,
            record.status,
        ];
    }

    return [
        record.fullName,
        record.email,
        record.role,
        record.agency,
        record.archivedBy,
        record.archiveDate,
        record.status,
    ];
}

function getRecordAgency(record: AdminArchivedRecord) {
    if (record.type === 'agency') {
        return record.shortName;
    }

    return record.agency ?? 'System';
}

function dateMatchesFilter(value: string, filter: AdminArchiveFilters['date']) {
    if (filter === 'all') {
        return true;
    }

    const archiveDate = new Date(value);
    const now = new Date();
    const daysOld =
        (now.getTime() - archiveDate.getTime()) / (1000 * 60 * 60 * 24);

    if (filter === 'last-7-days') {
        return daysOld >= 0 && daysOld <= 7;
    }

    if (filter === 'last-30-days') {
        return daysOld >= 0 && daysOld <= 30;
    }

    if (filter === 'this-month') {
        return (
            archiveDate.getFullYear() === now.getFullYear() &&
            archiveDate.getMonth() === now.getMonth()
        );
    }

    return archiveDate.getFullYear() === 2026;
}

function filterRecords(
    records: AdminArchivedRecord[],
    filters: AdminArchiveFilters,
    topbarSearch: string,
) {
    const queries = [filters.search, topbarSearch]
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase());

    return records.filter((record) => {
        const searchableText = getRecordSearchValues(record)
            .map(normalize)
            .join(' ');
        const searchMatches = queries.every((query) =>
            searchableText.includes(query),
        );
        const agencyMatches =
            filters.agency === 'all' || getRecordAgency(record) === filters.agency;
        const dateMatches = dateMatchesFilter(record.archiveDate, filters.date);
        const statusMatches =
            filters.status === 'all' || record.status === filters.status;
        const recordTypeMatches =
            filters.recordType === 'all' || record.type === filters.recordType;

        return (
            searchMatches &&
            agencyMatches &&
            dateMatches &&
            statusMatches &&
            recordTypeMatches
        );
    });
}

function uniqueSorted(values: string[]) {
    return Array.from(new Set(values)).sort((left, right) =>
        left.localeCompare(right),
    );
}

export function AdminArchivePage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [summary, setSummary] = useState<AdminArchiveSummary | null>(null);
    const [researchRecords, setResearchRecords] = useState<
        ArchivedResearchRecord[]
    >([]);
    const [agencyRecords, setAgencyRecords] = useState<ArchivedAgencyRecord[]>(
        [],
    );
    const [userRecords, setUserRecords] = useState<ArchivedUserRecord[]>([]);
    const [activities, setActivities] = useState<ArchiveActivity[]>([]);
    const [activeTab, setActiveTab] = useState<ArchiveRecordType>('research');
    const [filters, setFilters] =
        useState<AdminArchiveFilters>(initialFilters);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
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
            getArchivedResearchRecords(),
            getArchivedAgencyRecords(),
            getArchivedUserRecords(),
            getArchiveActivityTimeline(),
        ])
            .then(
                ([
                    loadedSummary,
                    loadedResearch,
                    loadedAgencies,
                    loadedUsers,
                    loadedActivities,
                ]) => {
                    if (!isCurrent) {
                        return;
                    }

                    setSummary(loadedSummary);
                    setResearchRecords(loadedResearch);
                    setAgencyRecords(loadedAgencies);
                    setUserRecords(loadedUsers);
                    setActivities(loadedActivities);
                    setError(null);
                },
            )
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
        setCurrentPage(1);
    }, [activeTab, filters, topbarSearch]);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => setFeedback(null), 3400);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    const recordsByTab = useMemo(
        () => ({
            research: researchRecords,
            agency: agencyRecords,
            user: userRecords,
        }),
        [agencyRecords, researchRecords, userRecords],
    );

    const activeRecords = recordsByTab[activeTab];

    const filteredRecords = useMemo(
        () => filterRecords(activeRecords, filters, topbarSearch),
        [activeRecords, filters, topbarSearch],
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

    const allRecords = useMemo(
        () => [...researchRecords, ...agencyRecords, ...userRecords],
        [agencyRecords, researchRecords, userRecords],
    );

    const agencies = useMemo(
        () =>
            uniqueSorted(
                allRecords
                    .map(getRecordAgency)
                    .filter((agency) => agency !== 'System'),
            ),
        [allRecords],
    );

    const displayedSummary = useMemo<AdminArchiveSummary | null>(() => {
        if (!summary) {
            return null;
        }

        return {
            archivedResearchRecords: researchRecords.length,
            archivedAgencies: agencyRecords.length,
            archivedUserAccounts: userRecords.length,
            recentlyRestored: activities.filter(
                (activity) => activity.type === 'record-restored',
            ).length,
        };
    }, [
        activities,
        agencyRecords.length,
        researchRecords.length,
        summary,
        userRecords.length,
    ]);

    const hasActiveFilters =
        Boolean(filters.search.trim()) ||
        Boolean(topbarSearch.trim()) ||
        filters.agency !== 'all' ||
        filters.date !== 'all' ||
        filters.status !== 'all' ||
        filters.recordType !== 'all';

    const removeRecordFromState = (record: AdminArchivedRecord) => {
        if (record.type === 'research') {
            setResearchRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
        }

        if (record.type === 'agency') {
            setAgencyRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
        }

        if (record.type === 'user') {
            setUserRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
        }
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
            setActivities((current) => [
                createArchiveActivity(
                    'record-restored',
                    selectedRestoreRecord,
                ),
                ...current,
            ]);
            setFeedback(
                `${getArchivedRecordTitle(selectedRestoreRecord)} was restored to its active module.`,
            );
            setSelectedRestoreRecord(null);
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
        } finally {
            setIsExporting(false);
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

                <ArchiveSummaryCards
                    summary={displayedSummary}
                    isLoading={isLoading}
                />

                <section className="mt-6 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                    <ArchiveTabs
                        activeTab={activeTab}
                        counts={{
                            research: researchRecords.length,
                            agency: agencyRecords.length,
                            user: userRecords.length,
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
                        records={paginatedRecords}
                        isLoading={isLoading}
                        currentPage={effectiveCurrentPage}
                        totalPages={totalPages}
                        totalResults={filteredRecords.length}
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
