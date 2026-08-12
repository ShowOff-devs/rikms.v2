import { normalizeModerationIssueType } from '@/data/research-moderation-options';
import { fetchApi } from '@/lib/api-client';
import type {
    FlaggedResearchRecord,
    ModerationActionPayload,
    ModerationIssueType,
} from '@/types/research-moderation';

export type AdminResearchApiRecord = {
    id: number;
    title: string;
    abstract?: string | null;
    authors?: string[];
    keywords?: string[];
    publication_year?: number | null;
    category?: string | null;
    status: string;
    moderation_issue_type?: string | null;
    moderation_note?: string | null;
    moderated_at?: string | null;
    agency?: { short_name?: string | null; name?: string | null };
    uploader?: { name?: string | null; role?: string | null };
    created_at?: string | null;
};

export async function getAdminModerationResearchRecords() {
    const { data } = await fetchApi<AdminResearchApiRecord[]>(
        '/api/admin/research?per_page=100',
    );

    return data
        .filter((record) =>
            ['submitted', 'under_review', 'approved', 'rejected'].includes(
                record.status,
            ),
        )
        .map(mapModerationRecordFromApi);
}

export async function approveAdminResearch(
    id: string,
    payload: ModerationActionPayload = {},
) {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}/approve`,
        {
            method: 'POST',
            body: JSON.stringify({ notes: payload.note }),
        },
    );

    return mapModerationRecordFromApi(data);
}

export async function rejectAdminResearch(
    id: string,
    payload: ModerationActionPayload = {},
) {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}/reject`,
        {
            method: 'POST',
            body: JSON.stringify({
                notes: payload.note,
                issue_type: payload.issueType,
            }),
        },
    );

    return mapModerationRecordFromApi(data);
}

export async function publishAdminResearch(
    id: string,
    payload: ModerationActionPayload = {},
) {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}/publish`,
        {
            method: 'POST',
            body: JSON.stringify({ notes: payload.note }),
        },
    );

    return mapModerationRecordFromApi(data);
}

export async function approveAndPublishAdminResearch(
    id: string,
    payload: ModerationActionPayload = {},
) {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}/approve-and-publish`,
        {
            method: 'POST',
            body: JSON.stringify({ notes: payload.note }),
        },
    );

    return mapModerationRecordFromApi(data);
}

export async function returnAdminResearch(
    id: string,
    payload: ModerationActionPayload = {},
) {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}/return`,
        {
            method: 'POST',
            body: JSON.stringify({ notes: payload.note }),
        },
    );

    return mapModerationRecordFromApi(data);
}

export async function archiveAdminResearch(
    id: string,
    payload: ModerationActionPayload = {},
) {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}/archive`,
        {
            method: 'POST',
            body: JSON.stringify({ reason: payload.note }),
        },
    );

    return mapModerationRecordFromApi(data);
}

function mapModerationRecordFromApi(
    record: AdminResearchApiRecord,
): FlaggedResearchRecord {
    const status = mapModerationStatus(record.status);
    const metadataAssessment = assessMetadata(record);
    const issueType = getIssueType(record, metadataAssessment.issueType);
    const issueDescription = getIssueDescription(
        record,
        issueType,
        metadataAssessment.missingFields,
    );

    return {
        id: String(record.id),
        title: record.title,
        agency: record.agency?.short_name ?? record.agency?.name ?? 'Agency',
        uploadedBy: record.uploader?.name ?? 'Agency Admin',
        uploaderRole: record.uploader?.role ?? 'agency_admin',
        officialStatus: record.status,
        issueType,
        year: record.publication_year ?? undefined,
        status,
        dateFlagged:
            record.moderated_at?.slice(0, 10) ??
            record.created_at?.slice(0, 10) ??
            new Date().toISOString().slice(0, 10),
        abstract: record.abstract ?? undefined,
        authors: record.authors ?? [],
        missingMetadataFields: metadataAssessment.missingFields,
        issueDescription,
        recommendedAction: getRecommendedAction(
            record.status,
            issueType,
            metadataAssessment.missingFields,
        ),
    };
}

const knownIssueTypes = new Set<ModerationIssueType>([
    'incomplete_metadata',
    'metadata_inconsistency',
    'document_file_issue',
    'possible_duplicate',
    'authorship_attribution_concern',
    'privacy_restricted_data_concern',
    'policy_noncompliance',
    'other_manual_review',
]);

function assessMetadata(record: AdminResearchApiRecord): {
    issueType: ModerationIssueType;
    missingFields: string[];
} {
    const missingFields: string[] = [];

    if (!record.title?.trim()) {
        missingFields.push('title');
    }

    if (!record.abstract?.trim()) {
        missingFields.push('abstract');
    }

    if (!record.authors?.some((author) => author.trim())) {
        missingFields.push('authors');
    }

    if (!record.publication_year) {
        missingFields.push('publication year');
    }

    if (!record.category?.trim()) {
        missingFields.push('category');
    }

    if (!record.keywords?.some((keyword) => keyword.trim())) {
        missingFields.push('keywords');
    }

    return {
        issueType:
            missingFields.length > 0
                ? 'incomplete_metadata'
                : 'other_manual_review',
        missingFields,
    };
}

function getIssueType(
    record: AdminResearchApiRecord,
    assessedIssueType: ModerationIssueType,
): ModerationIssueType {
    if (record.status !== 'rejected') {
        return assessedIssueType;
    }

    if (record.moderation_issue_type) {
        const normalized = normalizeModerationIssueType(
            record.moderation_issue_type,
        );

        if (knownIssueTypes.has(normalized)) {
            return normalized;
        }
    }

    return 'other_manual_review';
}

function getIssueDescription(
    record: AdminResearchApiRecord,
    issueType: ModerationIssueType,
    missingFields: string[],
): string {
    if (record.status === 'rejected') {
        return (
            record.moderation_note?.trim() ||
            `This record was flagged as ${issueType.replaceAll('_', ' ')} and requires moderator follow-up.`
        );
    }

    if (missingFields.length > 0) {
        return `Missing required metadata: ${missingFields.join(', ')}.`;
    }

    return 'The required metadata is complete. This submission is awaiting routine governance and content review.';
}

function mapModerationStatus(status: string): FlaggedResearchRecord['status'] {
    if (status === 'approved' || status === 'published') {
        return 'resolved';
    }

    if (status === 'rejected') {
        return 'flagged';
    }

    if (status === 'under_review') {
        return 'needs-review';
    }

    return 'pending-review';
}

function getRecommendedAction(
    status: string,
    issueType: ModerationIssueType,
    missingFields: string[],
) {
    if (status === 'approved') {
        return 'Publish approved research when ready.';
    }

    if (status === 'published') {
        return 'Research is published in the public repository.';
    }

    if (status === 'rejected') {
        return issueType === 'policy_noncompliance'
            ? 'The agency can now correct the documented policy concern and resubmit the record.'
            : 'The agency can now apply the revision instructions and resubmit the record.';
    }

    if (missingFields.length > 0) {
        return `Request completion of: ${missingFields.join(', ')}.`;
    }

    return 'Complete the routine content and governance review, then approve or request revisions.';
}
