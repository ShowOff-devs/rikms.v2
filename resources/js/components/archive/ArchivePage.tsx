import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { ArchiveActivityList } from '@/components/archive/ArchiveActivityList';
import { ArchivedResearchTable } from '@/components/archive/ArchivedResearchTable';
import { ArchiveFilters } from '@/components/archive/ArchiveFilters';
import { ArchivePagination } from '@/components/archive/ArchivePagination';
import { ArchiveStats } from '@/components/archive/ArchiveStats';
import { DeleteArchivedResearchModal } from '@/components/archive/DeleteArchivedResearchModal';
import { RestoreResearchModal } from '@/components/archive/RestoreResearchModal';
import {
    createArchiveActivity,
    filterArchivedResearch,
    getArchiveActivity,
    getArchivedResearch,
    permanentlyDeleteArchivedResearch,
    restoreArchivedResearch,
} from '@/lib/archive/archive-service';
import { useAgencySession } from '@/lib/auth/agency-auth';
import type {
    ArchiveActivity,
    ArchiveFilters as ArchiveFiltersValue,
    ArchivedResearch,
} from '@/types/archive';

const initialFilters: ArchiveFiltersValue = {
    search: '',
    documentType: 'all',
    date: 'all',
};

const initialRowsPerPage = 5;

function countRecentlyArchived(records: ArchivedResearch[]) {
    const now = new Date();

    return records.filter((record) => {
        const archiveDate = new Date(record.archiveDate);
        const daysOld =
            (now.getTime() - archiveDate.getTime()) / (1000 * 60 * 60 * 24);

        return daysOld >= 0 && daysOld <= 7;
    }).length;
}

export function ArchivePage() {
    const session = useAgencySession();
    const [records, setRecords] = useState<ArchivedResearch[]>([]);
    const [activities, setActivities] = useState<ArchiveActivity[]>([]);
    const [filters, setFilters] = useState<ArchiveFiltersValue>(initialFilters);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const [selectedRestore, setSelectedRestore] =
        useState<ArchivedResearch | null>(null);
    const [selectedDelete, setSelectedDelete] =
        useState<ArchivedResearch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([getArchivedResearch(), getArchiveActivity()])
            .then(([nextRecords, nextActivities]) => {
                if (!isCurrent) {
                    return;
                }

                setRecords(nextRecords);
                setActivities(nextActivities);
                setIsLoading(false);
            })
            .catch(() => {
                if (isCurrent) {
                    setIsLoading(false);
                    setFeedback('Unable to load archived research records.');
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(''), 3500);

        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const filteredRecords = useMemo(
        () => filterArchivedResearch(records, filters),
        [records, filters],
    );

    const hasActiveFilters = useMemo(
        () =>
            Boolean(
                filters.search.trim() ||
                filters.documentType !== 'all' ||
                filters.date !== 'all',
            ),
        [filters],
    );

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRecords.length / rowsPerPage),
    );
    const effectiveCurrentPage = Math.min(currentPage, totalPages);
    const pageStartIndex =
        filteredRecords.length === 0
            ? 0
            : (effectiveCurrentPage - 1) * rowsPerPage;
    const pageEndIndex = Math.min(
        pageStartIndex + rowsPerPage,
        filteredRecords.length,
    );
    const paginatedRecords = filteredRecords.slice(
        pageStartIndex,
        pageEndIndex,
    );
    const visibleStartIndex =
        filteredRecords.length === 0 ? 0 : pageStartIndex + 1;

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const updateFilters = (nextFilters: ArchiveFiltersValue) => {
        setFilters(nextFilters);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        updateFilters(initialFilters);
    };

    const addActivityToState = (activity: ArchiveActivity) => {
        setActivities((current) => [activity, ...current]);
    };

    const handleRestoreConfirm = async () => {
        if (!selectedRestore) {
            return;
        }

        setIsRestoring(true);

        try {
            const restoredRecord = await restoreArchivedResearch(
                selectedRestore.id,
            );

            if (restoredRecord) {
                setRecords((current) =>
                    current.filter((record) => record.id !== restoredRecord.id),
                );
                addActivityToState(
                    createArchiveActivity(
                        'research-restored',
                        restoredRecord.title,
                    ),
                );
                setFeedback(
                    `${restoredRecord.title} was restored to the active Research Repository.`,
                );
            }
        } catch (restoreError) {
            setFeedback(
                restoreError instanceof Error
                    ? restoreError.message
                    : 'Unable to restore archived research.',
            );
        }

        setSelectedRestore(null);
        setIsRestoring(false);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedDelete) {
            return;
        }

        setIsDeleting(true);

        try {
            const deletedRecord = await permanentlyDeleteArchivedResearch(
                selectedDelete.id,
            );

            if (deletedRecord) {
                setRecords((current) =>
                    current.filter((record) => record.id !== deletedRecord.id),
                );
                addActivityToState(
                    createArchiveActivity(
                        'research-permanently-deleted',
                        deletedRecord.title,
                    ),
                );
                setFeedback(`${deletedRecord.title} was permanently deleted.`);
            }
        } catch (deleteError) {
            setFeedback(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Unable to permanently delete archived research.',
            );
        }

        setSelectedDelete(null);
        setIsDeleting(false);
    };

    return (
        <>
            <Head title="Archived Research" />

            <AgencyAdminLayout
                session={session}
                search={filters.search}
                onSearchChange={(search) =>
                    updateFilters({ ...filters, search })
                }
            >
                <main className="px-4 py-8 lg:px-[56px]">
                    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
                        <section>
                            <nav className="flex h-5 items-center gap-1.5 text-sm leading-5">
                                <Link
                                    href="/agency/dashboard"
                                    className="text-[#6a7282] hover:text-[#1e3a8a]"
                                >
                                    Agency
                                </Link>
                                <ChevronRight className="size-3.5 text-[#6a7282]" />
                                <span className="font-medium text-[#1e3a8a]">
                                    Archive
                                </span>
                            </nav>
                            <h1 className="mt-5 text-2xl leading-9 font-bold text-[#1e3a8a]">
                                Archived Research
                            </h1>
                            <p className="text-sm leading-5 text-[#6b7280]">
                                Manage research records that have been archived
                                from the active repository.
                            </p>
                        </section>

                        {isLoading ? (
                            <ArchiveLoadingState />
                        ) : (
                            <>
                                <ArchiveStats
                                    totalArchived={records.length}
                                    recentlyArchived={countRecentlyArchived(
                                        records,
                                    )}
                                    restoredResearch={
                                        activities.filter(
                                            (activity) =>
                                                activity.type ===
                                                'research-restored',
                                        ).length
                                    }
                                />

                                {feedback ? (
                                    <div
                                        role="status"
                                        className="rounded-[10px] border border-[#b9f8cf] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#008236]"
                                    >
                                        {feedback}
                                    </div>
                                ) : null}

                                <section className="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                                    <ArchiveFilters
                                        filters={filters}
                                        hasActiveFilters={hasActiveFilters}
                                        onFiltersChange={updateFilters}
                                        onClearFilters={clearFilters}
                                    />

                                    <ArchivedResearchTable
                                        records={paginatedRecords}
                                        isLoading={false}
                                        onRestore={setSelectedRestore}
                                        onDelete={setSelectedDelete}
                                        onClearFilters={clearFilters}
                                    />

                                    <ArchivePagination
                                        currentPage={effectiveCurrentPage}
                                        totalPages={totalPages}
                                        rowsPerPage={rowsPerPage}
                                        totalItems={filteredRecords.length}
                                        startItem={visibleStartIndex}
                                        endItem={pageEndIndex}
                                        onPageChange={(page) =>
                                            setCurrentPage(
                                                Math.min(
                                                    Math.max(page, 1),
                                                    totalPages,
                                                ),
                                            )
                                        }
                                        onRowsPerPageChange={(nextRows) => {
                                            setRowsPerPage(nextRows);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </section>

                                <ArchiveActivityList activities={activities} />
                            </>
                        )}
                    </div>
                </main>
            </AgencyAdminLayout>

            <RestoreResearchModal
                record={selectedRestore}
                open={Boolean(selectedRestore)}
                isLoading={isRestoring}
                onOpenChange={(open) => {
                    if (!open && !isRestoring) {
                        setSelectedRestore(null);
                    }
                }}
                onConfirm={handleRestoreConfirm}
            />

            <DeleteArchivedResearchModal
                record={selectedDelete}
                open={Boolean(selectedDelete)}
                isLoading={isDeleting}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setSelectedDelete(null);
                    }
                }}
                onConfirm={handleDeleteConfirm}
            />
        </>
    );
}

function ArchiveLoadingState() {
    return (
        <>
            <section className="grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[90px] animate-pulse rounded-[10px] bg-white"
                    />
                ))}
            </section>
            <div className="h-[472px] animate-pulse rounded-[10px] bg-white" />
            <div className="h-[256px] animate-pulse rounded-[10px] bg-white" />
        </>
    );
}
