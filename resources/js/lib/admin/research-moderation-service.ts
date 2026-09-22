import {
    approveAdminResearch,
    approveAndPublishAdminResearch,
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
    originalStatus: string;
    matchingStatus: string;
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

export async function getModerationSummary(): Promise<ModerationSummary> {
    const result = await getAdminModerationResearchRecords({}, 1, 1);

    return {
        ...result.summary,
        duplicateResearchAlerts: 0,
    };
}

export async function getFlaggedResearchRecords(
    filters: Partial<ModerationFilters> = {},
    page = 1,
    perPage = 8,
) {
    return getAdminModerationResearchRecords(filters, page, perPage);
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
        originalStatus: match.originalStatus,
        matchingStatus: match.matchingStatus,
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

export async function flagDuplicateResearchMatch(
    match: DuplicateResearchMatch,
    note: string,
) {
    return fetchApi<{ pair_key: string; matching_research_id: number }>(
        '/api/admin/research-moderation/duplicates/flag',
        {
            method: 'POST',
            body: JSON.stringify({
                original_research_id: Number(match.originalResearchId),
                matching_research_id: Number(match.matchingResearchId),
                notes: note,
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

export async function approveAndPublishResearchRecord(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    return approveAndPublishAdminResearch(id, payload);
}

export async function flagResearchForReview(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    return rejectAdminResearch(id, payload);
}

export async function returnResearchToDraft(
    id: string,
    payload: ModerationActionPayload = {},
): Promise<FlaggedResearchRecord> {
    return returnAdminResearch(id, payload);
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

        if (filters.issueType && filters.issueType !== 'all') {
            params.set('issue_type', filters.issueType);
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
