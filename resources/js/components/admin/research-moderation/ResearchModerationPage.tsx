import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { moderationIssueTypeLabels } from '@/data/mock-research-moderation';
import {
    archiveFlaggedResearch,
    exportModerationReport,
    flagResearchForReview,
    getDuplicateResearchMatches,
    getFlaggedResearchRecords,
    getModerationActivityLog,
    markResearchIssueResolved,
} from '@/lib/admin/research-moderation-service';
import type {
    DuplicateResearchMatch,
    FlaggedResearchRecord,
    ModerationActivity,
    ModerationFilters,
    ModerationReportExportOptions,
    ModerationSummary,
} from '@/types/research-moderation';
import { DuplicateComparisonModal } from './DuplicateComparisonModal';
import { DuplicateDetectionPanel } from './DuplicateDetectionPanel';
import { ExportModerationReportModal } from './ExportModerationReportModal';
import { FlaggedResearchTable } from './FlaggedResearchTable';
import { ModerationActivityLog } from './ModerationActivityLog';
import type { ModerationConfirmationAction } from './ModerationConfirmationModal';
import {
    ModerationConfirmationModal,
} from './ModerationConfirmationModal';
import { ModerationFilters as ModerationFilterControls } from './ModerationFilters';
import { ModerationHeader } from './ModerationHeader';
import { ModerationSummaryCards } from './ModerationSummaryCards';
import { ResearchModerationDetailsModal } from './ResearchModerationDetailsModal';
import { ReviewResearchRecordModal } from './ReviewResearchRecordModal';

const rowsPerPage = 8;

const initialFilters: ModerationFilters = {
    search: '',
    agency: 'all',
    issueType: 'all',
    year: 'all',
    status: 'all',
};

function normalize(value: string | number | undefined) {
    return String(value ?? '').toLowerCase();
}

function createActivity(
    type: ModerationActivity['type'],
    action: string,
    researchTitle: string,
): ModerationActivity {
    return {
        id: `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        actor: 'Super Admin',
        action,
        researchTitle,
        timestamp: new Date().toISOString(),
        type,
    };
}

function getSearchableRecordText(record: FlaggedResearchRecord) {
    return [
        record.title,
        record.agency,
        record.uploadedBy,
        record.uploaderRole,
        moderationIssueTypeLabels[record.issueType],
        record.issueType,
        record.year,
        record.status,
    ]
        .map(normalize)
        .join(' ');
}

function filterRecords(
    records: FlaggedResearchRecord[],
    filters: ModerationFilters,
    topbarSearch: string,
) {
    const queries = [filters.search, topbarSearch]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    return records.filter((record) => {
        const searchableText = getSearchableRecordText(record);
        const searchMatches = queries.every((query) =>
            searchableText.includes(query),
        );
        const agencyMatches =
            filters.agency === 'all' || record.agency === filters.agency;
        const issueMatches =
            filters.issueType === 'all' ||
            record.issueType === filters.issueType;
        const yearMatches =
            filters.year === 'all' || String(record.year) === filters.year;
        const statusMatches =
            filters.status === 'all' || record.status === filters.status;

        return (
            searchMatches &&
            agencyMatches &&
            issueMatches &&
            yearMatches &&
            statusMatches
        );
    });
}

function makeDuplicateModerationRecord(
    match: DuplicateResearchMatch,
): FlaggedResearchRecord {
    return {
        id: `duplicate-${match.id}`,
        title: match.matchingTitle,
        agency: match.matchingAgency,
        uploadedBy: 'Duplicate Detection Service',
        uploaderRole: 'System-generated moderation flag',
        issueType: 'duplicate-research',
        year: match.matchingYear ?? new Date(match.detectedAt).getFullYear(),
        status: 'pending-review',
        dateFlagged: new Date().toISOString().slice(0, 10),
        authors: match.matchingAuthors,
        abstract: match.matchingAbstract,
        issueDescription: `Potential duplicate of "${match.originalTitle}" from ${match.originalAgency}. Similarity score: ${match.similarityScore}%.`,
        recommendedAction:
            'Compare both records and confirm whether this is a duplicate submission or a valid updated version.',
    };
}

export function ResearchModerationPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [filters, setFilters] = useState<ModerationFilters>(initialFilters);
    const [records, setRecords] = useState<FlaggedResearchRecord[]>([]);
    const [duplicates, setDuplicates] = useState<DuplicateResearchMatch[]>([]);
    const [activities, setActivities] = useState<ModerationActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDetailsRecord, setSelectedDetailsRecord] =
        useState<FlaggedResearchRecord | null>(null);
    const [selectedReviewRecord, setSelectedReviewRecord] =
        useState<FlaggedResearchRecord | null>(null);
    const [confirmationAction, setConfirmationAction] =
        useState<ModerationConfirmationAction | null>(null);
    const [confirmationRecord, setConfirmationRecord] =
        useState<FlaggedResearchRecord | null>(null);
    const [confirmationDuplicate, setConfirmationDuplicate] =
        useState<DuplicateResearchMatch | null>(null);
    const [comparisonMatch, setComparisonMatch] =
        useState<DuplicateResearchMatch | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getFlaggedResearchRecords(),
            getDuplicateResearchMatches(),
            getModerationActivityLog(),
        ])
            .then(([loadedRecords, loadedDuplicates, loadedActivities]) => {
                if (!isCurrent) {
                    return;
                }

                setRecords(loadedRecords);
                setDuplicates(loadedDuplicates);
                setActivities(loadedActivities);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load research moderation data.');
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

    const summary = useMemo<ModerationSummary>(
        () => ({
            flaggedResearchRecords: records.filter(
                (record) => record.status !== 'resolved',
            ).length,
            pendingReview: records.filter(
                (record) => record.status === 'pending-review',
            ).length,
            resolvedIssues: records.filter(
                (record) => record.status === 'resolved',
            ).length,
            duplicateResearchAlerts: duplicates.length,
        }),
        [duplicates.length, records],
    );

    const agencies = useMemo(
        () =>
            Array.from(new Set(records.map((record) => record.agency))).sort(
                (left, right) => left.localeCompare(right),
            ),
        [records],
    );

    const years = useMemo(
        () =>
            Array.from(
                new Set(records.map((record) => String(record.year))),
            ).sort((left, right) => Number(right) - Number(left)),
        [records],
    );

    const filteredRecords = useMemo(
        () => filterRecords(records, filters, topbarSearch),
        [filters, records, topbarSearch],
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

    const closeConfirmation = () => {
        if (isActionLoading) {
            return;
        }

        setConfirmationAction(null);
        setConfirmationRecord(null);
        setConfirmationDuplicate(null);
    };

    const openConfirmation = (
        record: FlaggedResearchRecord,
        action: ModerationConfirmationAction,
        duplicate?: DuplicateResearchMatch,
    ) => {
        setConfirmationRecord(record);
        setConfirmationAction(action);
        setConfirmationDuplicate(duplicate ?? null);
    };

    const resolveRecord = async (
        record: FlaggedResearchRecord,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            await markResearchIssueResolved(record.id, { note });
            setRecords((current) =>
                current.map((item) =>
                    item.id === record.id
                        ? { ...item, status: 'resolved' }
                        : item,
                ),
            );
            setActivities((current) => [
                createActivity('issue-resolved', 'Marked issue as resolved:', record.title),
                ...current,
            ]);
            setFeedback(`${record.title} was marked as resolved.`);
            setSelectedReviewRecord(null);
            closeConfirmation();
        } finally {
            setIsActionLoading(false);
        }
    };

    const flagRecord = async (
        record: FlaggedResearchRecord,
        duplicate?: DuplicateResearchMatch | null,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            await flagResearchForReview(record.id, { note });
            setRecords((current) => {
                const exists = current.some((item) => item.id === record.id);

                if (!exists) {
                    return [{ ...record, status: 'pending-review' }, ...current];
                }

                return current.map((item) =>
                    item.id === record.id
                        ? { ...item, status: 'pending-review' }
                        : item,
                );
            });

            if (duplicate) {
                setDuplicates((current) =>
                    current.filter((item) => item.id !== duplicate.id),
                );
                setComparisonMatch(null);
            }

            setActivities((current) => [
                createActivity('revision-requested', 'Flagged for review:', record.title),
                ...current,
            ]);
            setFeedback(`${record.title} was flagged for review.`);
            setSelectedReviewRecord(null);
            closeConfirmation();
        } finally {
            setIsActionLoading(false);
        }
    };

    const archiveRecord = async (
        record: FlaggedResearchRecord,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            await archiveFlaggedResearch(record.id, { note });
            setRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
            setActivities((current) => [
                createActivity('archived', 'Archived research:', record.title),
                ...current,
            ]);
            setFeedback(`${record.title} was archived.`);
            setSelectedReviewRecord(null);
            closeConfirmation();
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReviewSave = async (
        action: 'resolved' | 'flagged' | 'archived',
        note: string,
    ) => {
        if (!selectedReviewRecord) {
            return;
        }

        if (action === 'resolved') {
            await resolveRecord(selectedReviewRecord, note);
        }

        if (action === 'flagged') {
            await flagRecord(selectedReviewRecord, null, note);
        }

        if (action === 'archived') {
            await archiveRecord(selectedReviewRecord, note);
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmationRecord || !confirmationAction) {
            return;
        }

        if (confirmationAction === 'resolve') {
            await resolveRecord(confirmationRecord);
        }

        if (confirmationAction === 'flag') {
            await flagRecord(confirmationRecord, confirmationDuplicate);
        }

        if (confirmationAction === 'archive') {
            await archiveRecord(confirmationRecord);
        }
    };

    const handleDuplicateFlag = (match: DuplicateResearchMatch) => {
        openConfirmation(makeDuplicateModerationRecord(match), 'flag', match);
    };

    const handleMarkNotDuplicate = (match: DuplicateResearchMatch) => {
        setDuplicates((current) =>
            current.filter((item) => item.id !== match.id),
        );
        setActivities((current) => [
            createActivity('duplicate-resolved', 'Marked not duplicate:', match.matchingTitle),
            ...current,
        ]);

        setComparisonMatch(null);
        setFeedback(`${match.matchingTitle} was removed from duplicate alerts.`);
    };

    const handleExport = async (options: ModerationReportExportOptions) => {
        setIsExporting(true);

        try {
            const result = await exportModerationReport(options);
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
                    <ModerationHeader onExport={() => setIsExportOpen(true)} />

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

                    <ModerationSummaryCards
                        summary={summary}
                        isLoading={isLoading}
                    />

                    <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                        <ModerationFilterControls
                            filters={filters}
                            agencies={agencies}
                            years={years}
                            onFiltersChange={setFilters}
                        />
                        <FlaggedResearchTable
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
                            onView={(record) =>
                                setSelectedDetailsRecord(record)
                            }
                            onReview={(record) => {
                                setSelectedDetailsRecord(null);
                                setSelectedReviewRecord(record);
                            }}
                            onResolve={(record) =>
                                openConfirmation(record, 'resolve')
                            }
                            onFlag={(record) => openConfirmation(record, 'flag')}
                            onArchive={(record) =>
                                openConfirmation(record, 'archive')
                            }
                        />
                    </section>

                    <DuplicateDetectionPanel
                        matches={duplicates}
                        isLoading={isLoading}
                        onViewComparison={setComparisonMatch}
                        onFlagForReview={handleDuplicateFlag}
                    />

                    <ModerationActivityLog
                        activities={activities}
                        isLoading={isLoading}
                    />
                </div>
            </main>

            <ResearchModerationDetailsModal
                record={selectedDetailsRecord}
                open={Boolean(selectedDetailsRecord)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedDetailsRecord(null);
                    }
                }}
                onReview={(record) => {
                    setSelectedDetailsRecord(null);
                    setSelectedReviewRecord(record);
                }}
            />

            <ReviewResearchRecordModal
                record={selectedReviewRecord}
                open={Boolean(selectedReviewRecord)}
                isSaving={isActionLoading}
                onOpenChange={(open) => {
                    if (!open && !isActionLoading) {
                        setSelectedReviewRecord(null);
                    }
                }}
                onSave={handleReviewSave}
            />

            <ModerationConfirmationModal
                record={confirmationRecord}
                action={confirmationAction}
                open={Boolean(confirmationRecord && confirmationAction)}
                isSaving={isActionLoading}
                onOpenChange={(open) => {
                    if (!open) {
                        closeConfirmation();
                    }
                }}
                onConfirm={handleConfirmAction}
            />

            <DuplicateComparisonModal
                match={comparisonMatch}
                open={Boolean(comparisonMatch)}
                onOpenChange={(open) => {
                    if (!open) {
                        setComparisonMatch(null);
                    }
                }}
                onFlagForReview={handleDuplicateFlag}
                onMarkNotDuplicate={handleMarkNotDuplicate}
            />

            <ExportModerationReportModal
                open={isExportOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportOpen}
                onExport={handleExport}
            />
        </AdminLayout>
    );
}
