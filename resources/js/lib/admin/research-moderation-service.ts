import {
    duplicateResearchMatches,
    flaggedResearchRecords,
    moderationActivities,
    moderationIssueTypeLabels,
} from '@/data/mock-research-moderation';
import type {
    DuplicateResearchMatch,
    FlaggedResearchRecord,
    ModerationActionPayload,
    ModerationActivity,
    ModerationFilters,
    ModerationReportExportOptions,
    ModerationReportExportResult,
    ModerationSummary,
} from '@/types/research-moderation';

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

function isFilterActive(value?: string) {
    return Boolean(value && value !== 'all');
}

function matchesFilters(
    record: FlaggedResearchRecord,
    filters: Partial<ModerationFilters> = {},
) {
    const query = filters.search?.trim().toLowerCase();

    if (query) {
        const searchableText = [
            record.title,
            record.agency,
            record.uploadedBy,
            record.uploaderRole,
            moderationIssueTypeLabels[record.issueType],
            record.issueType,
            record.year,
            record.status,
        ]
            .join(' ')
            .toLowerCase();

        if (!searchableText.includes(query)) {
            return false;
        }
    }

    if (isFilterActive(filters.agency) && record.agency !== filters.agency) {
        return false;
    }

    if (
        isFilterActive(filters.issueType) &&
        record.issueType !== filters.issueType
    ) {
        return false;
    }

    if (isFilterActive(filters.year) && String(record.year) !== filters.year) {
        return false;
    }

    if (isFilterActive(filters.status) && record.status !== filters.status) {
        return false;
    }

    return true;
}

export async function getModerationSummary(): Promise<ModerationSummary> {
    await mockNetworkDelay();

    return {
        flaggedResearchRecords: flaggedResearchRecords.filter(
            (record) => record.status !== 'resolved',
        ).length,
        pendingReview: flaggedResearchRecords.filter(
            (record) => record.status === 'pending-review',
        ).length,
        resolvedIssues: flaggedResearchRecords.filter(
            (record) => record.status === 'resolved',
        ).length,
        duplicateResearchAlerts: duplicateResearchMatches.length,
    };
}

export async function getFlaggedResearchRecords(
    filters: Partial<ModerationFilters> = {},
): Promise<FlaggedResearchRecord[]> {
    await mockNetworkDelay();

    return flaggedResearchRecords.filter((record) =>
        matchesFilters(record, filters),
    );
}

export async function getDuplicateResearchMatches(): Promise<
    DuplicateResearchMatch[]
> {
    await mockNetworkDelay();

    return duplicateResearchMatches;
}

export async function getModerationActivityLog(): Promise<
    ModerationActivity[]
> {
    await mockNetworkDelay();

    return moderationActivities;
}

export async function markResearchIssueResolved(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<{ id: string; status: 'resolved'; payload: ModerationActionPayload }> {
    await mockNetworkDelay(360);

    return { id, status: 'resolved', payload };
}

export async function flagResearchForReview(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<{
    id: string;
    status: 'pending-review';
    payload: ModerationActionPayload;
}> {
    await mockNetworkDelay(360);

    return { id, status: 'pending-review', payload };
}

export async function archiveFlaggedResearch(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<{ id: string; archived: true; payload: ModerationActionPayload }> {
    await mockNetworkDelay(460);

    return { id, archived: true, payload };
}

export async function exportModerationReport(
    options: ModerationReportExportOptions,
): Promise<ModerationReportExportResult> {
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const dateStamp = generatedAt.slice(0, 10);

    return {
        id: `research-moderation-export-${Date.now()}`,
        fileName: `rikms-moderation-report-${dateStamp}.${options.format}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}
