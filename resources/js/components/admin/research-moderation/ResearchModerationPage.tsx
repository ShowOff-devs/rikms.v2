import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { moderationIssueTypeLabels } from '@/data/research-moderation-options';
import { getAllowedResearchModerationActions } from '@/lib/admin/research-moderation-actions';
import type { ResearchModerationAction } from '@/lib/admin/research-moderation-actions';
import {
    archiveFlaggedResearch,
    approveAndPublishResearchRecord,
    dismissDuplicateResearchMatch,
    exportModerationReport,
    flagResearchForReview,
    getDuplicateResearchMatches,
    getFlaggedResearchRecords,
    getModerationActivityLog,
    markResearchIssueResolved,
    publishResearchRecord,
    returnResearchToDraft,
} from '@/lib/admin/research-moderation-service';
import type {
    DuplicateResearchMatch,
    FlaggedResearchRecord,
    ModerationActivity,
    ModerationFilters,
    ModerationIssueType,
    ModerationReportExportOptions,
    ModerationSummary,
} from '@/types/research-moderation';
import { DuplicateComparisonModal } from './DuplicateComparisonModal';
import { DuplicateDetectionPanel } from './DuplicateDetectionPanel';
import { ExportModerationReportModal } from './ExportModerationReportModal';
import { FlaggedResearchTable } from './FlaggedResearchTable';
import { ModerationActivityLog } from './ModerationActivityLog';
import type { ModerationConfirmationAction } from './ModerationConfirmationModal';
import { ModerationConfirmationModal } from './ModerationConfirmationModal';
import { ModerationFilters as ModerationFilterControls } from './ModerationFilters';
import { ModerationHeader } from './ModerationHeader';
import { ModerationSummaryCards } from './ModerationSummaryCards';
import { ResearchModerationDetailsModal } from './ResearchModerationDetailsModal';
import { ReviewResearchRecordModal } from './ReviewResearchRecordModal';

const rowsPerPage = 8;

type ModerationFeedback =
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
    | null;

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
        record.officialStatus,
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
        id: match.matchingResearchId,
        title: match.matchingTitle,
        agency: match.matchingAgency,
        uploadedBy: 'Duplicate Detection Service',
        uploaderRole: 'System-generated moderation flag',
        issueType: 'possible_duplicate',
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
    const [feedback, setFeedback] = useState<ModerationFeedback>(null);
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

        const timeout = window.setTimeout(() => setFeedback(null), 5000);

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
                new Set(
                    records
                        .map((record) => record.year)
                        .filter((year): year is number => year !== undefined)
                        .map(String),
                ),
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

    const closeConfirmation = (force = false) => {
        if (isActionLoading && !force) {
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
        const actionMap: Record<
            ModerationConfirmationAction,
            ResearchModerationAction
        > = {
            resolve: 'approve',
            publish: 'publish',
            flag: 'flag_for_review',
            return_to_draft: 'return_to_draft',
            archive: 'archive',
        };

        if (
            !getAllowedResearchModerationActions(record).has(actionMap[action])
        ) {
            setFeedback({
                type: 'error',
                message:
                    'This action is not allowed for the current research status.',
            });

            return;
        }

        setConfirmationRecord(record);
        setConfirmationAction(action);
        setConfirmationDuplicate(duplicate ?? null);
    };

    const approveRecord = async (
        record: FlaggedResearchRecord,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            const updatedRecord = await markResearchIssueResolved(record.id, {
                note,
            });
            setRecords((current) =>
                current.map((item) =>
                    item.id === record.id
                        ? { ...item, ...updatedRecord, status: 'resolved' }
                        : item,
                ),
            );
            setActivities((current) => [
                createActivity('approved', 'Approved research:', record.title),
                ...current,
            ]);
            setFeedback({
                type: 'success',
                message: `${record.title} was approved.`,
            });
            setSelectedReviewRecord(null);
            closeConfirmation(true);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to complete moderation action.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const approveAndPublishRecord = async (
        record: FlaggedResearchRecord,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            await approveAndPublishResearchRecord(record.id, { note });
            setRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
            setActivities((current) => [
                createActivity(
                    'version-approved',
                    'Approved and published research:',
                    record.title,
                ),
                ...current,
            ]);
            setFeedback({
                type: 'success',
                message: `${record.title} was approved and published.`,
            });
            setSelectedReviewRecord(null);
            closeConfirmation(true);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to approve and publish research.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const publishRecord = async (
        record: FlaggedResearchRecord,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            await publishResearchRecord(record.id, { note });
            setRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
            setActivities((current) => [
                createActivity(
                    'version-approved',
                    'Published research:',
                    record.title,
                ),
                ...current,
            ]);
            setFeedback({
                type: 'success',
                message: `${record.title} was published.`,
            });
            setSelectedReviewRecord(null);
            closeConfirmation(true);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to publish research.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const flagRecord = async (
        record: FlaggedResearchRecord,
        duplicate?: DuplicateResearchMatch | null,
        note?: string,
        issueType: ModerationIssueType = 'other_manual_review',
    ) => {
        setIsActionLoading(true);

        try {
            const updatedRecord = await flagResearchForReview(record.id, {
                note,
                issueType,
            });
            setRecords((current) => {
                const exists = current.some((item) => item.id === record.id);

                if (!exists) {
                    return [{ ...record, ...updatedRecord }, ...current];
                }

                return current.map((item) =>
                    item.id === record.id
                        ? { ...item, ...updatedRecord }
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
                createActivity(
                    'revision-requested',
                    'Flagged for review:',
                    record.title,
                ),
                ...current,
            ]);
            setFeedback({
                type: 'success',
                message: `${record.title} was flagged for review.`,
            });
            setSelectedReviewRecord(null);
            closeConfirmation(true);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to complete moderation action.',
            });
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
            setFeedback({
                type: 'success',
                message: `${record.title} was archived.`,
            });
            setSelectedReviewRecord(null);
            closeConfirmation(true);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to archive research.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const returnRecordToDraft = async (
        record: FlaggedResearchRecord,
        note?: string,
    ) => {
        setIsActionLoading(true);

        try {
            await returnResearchToDraft(record.id, { note });
            setRecords((current) =>
                current.filter((item) => item.id !== record.id),
            );
            setActivities((current) => [
                createActivity(
                    'revision-requested',
                    'Returned research to draft:',
                    record.title,
                ),
                ...current,
            ]);
            setFeedback({
                type: 'success',
                message: `${record.title} was returned to draft.`,
            });
            setSelectedReviewRecord(null);
            closeConfirmation(true);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to return research to draft.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReviewSave = async (
        action:
            | 'approved'
            | 'published'
            | 'approved-published'
            | 'flagged'
            | 'returned'
            | 'archived',
        note: string,
        issueType?: ModerationIssueType,
    ) => {
        if (!selectedReviewRecord) {
            return;
        }

        if (action === 'approved') {
            await approveRecord(selectedReviewRecord, note);
        }

        if (action === 'approved-published') {
            await approveAndPublishRecord(selectedReviewRecord, note);
        }

        if (action === 'published') {
            await publishRecord(selectedReviewRecord, note);
        }

        if (action === 'flagged') {
            await flagRecord(
                selectedReviewRecord,
                null,
                note,
                issueType ?? 'other_manual_review',
            );
        }

        if (action === 'returned') {
            await returnRecordToDraft(selectedReviewRecord, note);
        }

        if (action === 'archived') {
            await archiveRecord(selectedReviewRecord, note);
        }
    };

    const handleConfirmAction = async (
        note?: string,
        issueType?: ModerationIssueType,
    ) => {
        if (!confirmationRecord || !confirmationAction) {
            return;
        }

        if (confirmationAction === 'resolve') {
            await approveRecord(confirmationRecord);
        }

        if (confirmationAction === 'publish') {
            await publishRecord(confirmationRecord);
        }

        if (confirmationAction === 'flag') {
            await flagRecord(
                confirmationRecord,
                confirmationDuplicate,
                note,
                issueType ?? 'other_manual_review',
            );
        }

        if (confirmationAction === 'return_to_draft') {
            await returnRecordToDraft(confirmationRecord, note);
        }

        if (confirmationAction === 'archive') {
            await archiveRecord(confirmationRecord, note);
        }
    };

    const handleDuplicateFlag = (match: DuplicateResearchMatch) => {
        openConfirmation(makeDuplicateModerationRecord(match), 'flag', match);
    };

    const handleMarkNotDuplicate = async (match: DuplicateResearchMatch) => {
        setIsActionLoading(true);

        try {
            await dismissDuplicateResearchMatch(match);
            setDuplicates((current) =>
                current.filter((item) => item.id !== match.id),
            );
            setActivities((current) => [
                createActivity(
                    'duplicate-resolved',
                    'Marked not duplicate:',
                    match.matchingTitle,
                ),
                ...current,
            ]);

            setComparisonMatch(null);
            setFeedback({
                type: 'success',
                message: `${match.matchingTitle} was removed from duplicate alerts.`,
            });
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to dismiss duplicate match.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleExport = async (options: ModerationReportExportOptions) => {
        setIsExporting(true);

        try {
            const result = await exportModerationReport(options, filters);
            setFeedback({
                type: 'success',
                message: `${result.fileName} was downloaded.`,
            });
            setIsExportOpen(false);
        } catch (caught) {
            setFeedback({
                type: 'error',
                message:
                    caught instanceof Error
                        ? caught.message
                        : 'Unable to export moderation report.',
            });
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
                            className={
                                feedback.type === 'success'
                                    ? 'rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]'
                                    : 'rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]'
                            }
                        >
                            {feedback.message}
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
                            onPublish={(record) =>
                                openConfirmation(record, 'publish')
                            }
                            onFlag={(record) =>
                                openConfirmation(record, 'flag')
                            }
                            onReturnToDraft={(record) =>
                                openConfirmation(record, 'return_to_draft')
                            }
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
                key={selectedReviewRecord?.id ?? 'closed-review'}
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
                key={`${confirmationRecord?.id ?? 'closed'}-${confirmationAction ?? 'none'}`}
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
