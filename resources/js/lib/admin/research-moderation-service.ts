import { moderationIssueTypeLabels } from '@/data/research-moderation-options';
import {
    approveAdminResearch,
    archiveAdminResearch,
    getAdminModerationResearchRecords,
    publishAdminResearch,
    rejectAdminResearch,
    returnAdminResearch,
} from '@/lib/admin/admin-moderation-service';
import { fetchApi } from '@/lib/api-client';
import { downloadResponseFile } from '@/lib/download-file';
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

type ApiDuplicateResearchMatch = {
    id: string;
    original_research_id: number;
    matching_research_id: number;
    originalTitle: string;
    matchingTitle: string;
    originalAgency: string;
    matchingAgency: string;
    similarityScore: number;
    detectedAt: string;
    originalAuthors?: string[];
    matchingAuthors?: string[];
    originalYear?: number;
    matchingYear?: number;
    matchReason?: string;
    originalAbstract?: string | null;
    matchingAbstract?: string | null;
};

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
            record.officialStatus,
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
    const { data } = await fetchApi<ApiDuplicateResearchMatch[]>(
        '/api/admin/research-moderation/duplicates',
    );

    return data.map((match) => ({
        id: match.id,
        originalResearchId: String(match.original_research_id),
        matchingResearchId: String(match.matching_research_id),
        originalTitle: match.originalTitle,
        matchingTitle: match.matchingTitle,
        originalAgency: match.originalAgency,
        matchingAgency: match.matchingAgency,
        similarityScore: match.similarityScore,
        detectedAt: match.detectedAt,
        originalAuthors: match.originalAuthors,
        matchingAuthors: match.matchingAuthors,
        originalYear: match.originalYear,
        matchingYear: match.matchingYear,
        matchReason: match.matchReason,
        originalAbstract: match.originalAbstract ?? undefined,
        matchingAbstract: match.matchingAbstract ?? undefined,
    }));
}

export async function getModerationActivityLog(): Promise<
    ModerationActivity[]
> {
    const { data } = await fetchApi<ModerationActivity[]>(
        '/api/admin/research-moderation/activity',
    );

    return data;
}

export async function dismissDuplicateResearchMatch(
    match: DuplicateResearchMatch,
) {
    await fetchApi<{ pair_key: string }>(
        '/api/admin/research-moderation/duplicates/dismiss',
        {
            method: 'POST',
            body: JSON.stringify({
                original_research_id: Number(match.originalResearchId),
                matching_research_id: Number(match.matchingResearchId),
            }),
        },
    );
}

export async function markResearchIssueResolved(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    return approveAdminResearch(id, payload);
}

export async function publishResearchRecord(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    return publishAdminResearch(id, payload);
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
    filters: Partial<ModerationFilters> = {},
): Promise<ModerationReportExportResult> {
    const params = new URLSearchParams({
        format: options.format,
        date_range: options.dateRange,
    });

    if (options.startDate) {
        params.set('start_date', options.startDate);
    }

    if (options.endDate) {
        params.set('end_date', options.endDate);
    }

    if (options.includeCurrentFilters) {
        if (filters.search?.trim()) {
            params.set('search', filters.search.trim());
        }

        if (filters.agency && filters.agency !== 'all') {
            params.set('agency', filters.agency);
        }

        if (filters.status && filters.status !== 'all') {
            params.set('moderation_status', filters.status);
        }

        if (filters.year && filters.year !== 'all') {
            params.set('publicationYear', filters.year);
        }
    }

    const response = await fetch(
        `/api/admin/reports/moderation/export?${params}`,
        {
            credentials: 'same-origin',
            headers: {
                Accept: 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) {
        throw new Error('Unable to export moderation report.');
    }

    const generatedAt = new Date().toISOString();
    const { fileName } = await downloadResponseFile(
        response,
        `rikms-moderation-report-${generatedAt.slice(0, 10)}.csv`,
    );

    return {
        id: `research-moderation-export-${Date.now()}`,
        fileName,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}
