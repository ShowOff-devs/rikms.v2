import { moderationIssueTypeLabels } from '@/data/research-moderation-options';
import {
    approveAdminResearch,
    archiveAdminResearch,
    getAdminModerationResearchRecords,
    publishAdminResearch,
    rejectAdminResearch,
    returnAdminResearch,
} from '@/lib/admin/admin-moderation-service';
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
    const records = await getAdminModerationResearchRecords();

    return {
        flaggedResearchRecords: records.filter(
            (record) => record.status !== 'resolved',
        ).length,
        pendingReview: records.filter(
            (record) => record.status === 'pending-review',
        ).length,
        resolvedIssues: records.filter((record) => record.status === 'resolved')
            .length,
        duplicateResearchAlerts: 0,
    };
}

export async function getFlaggedResearchRecords(
    filters: Partial<ModerationFilters> = {},
): Promise<FlaggedResearchRecord[]> {
    const records = await getAdminModerationResearchRecords();

    return records.filter((record) => matchesFilters(record, filters));
}

export async function getDuplicateResearchMatches(): Promise<
    DuplicateResearchMatch[]
> {
    return [];
}

export async function getModerationActivityLog(): Promise<
    ModerationActivity[]
> {
    return [];
}

export async function markResearchIssueResolved(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    try {
        return await approveAdminResearch(id, payload);
    } catch {
        return publishAdminResearch(id, payload);
    }
}

export async function flagResearchForReview(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    try {
        return await rejectAdminResearch(id, payload);
    } catch {
        return returnAdminResearch(id, payload);
    }
}

export async function archiveFlaggedResearch(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    return archiveAdminResearch(id, payload);
}

export async function exportModerationReport(
    options: ModerationReportExportOptions,
): Promise<ModerationReportExportResult> {
    const response = await fetch('/api/admin/reports/research/export', {
        credentials: 'same-origin',
        headers: { Accept: 'text/csv', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!response.ok) {
        throw new Error('Unable to export moderation report.');
    }

    return {
        id: `research-moderation-export-${Date.now()}`,
        fileName: `rikms-moderation-report-${new Date().toISOString().slice(0, 10)}.csv`,
        format: options.format,
        generatedAt: new Date().toISOString(),
        status: 'ready',
    };
}
