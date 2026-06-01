import { fetchApi } from '@/lib/api-client';
import type {
    FlaggedResearchRecord,
    ModerationActionPayload,
} from '@/types/research-moderation';

export type AdminResearchApiRecord = {
    id: number;
    title: string;
    abstract?: string | null;
    authors?: string[];
    publication_year?: number | null;
    status: string;
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
            body: JSON.stringify({ notes: payload.note }),
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
            body: JSON.stringify({
                reason: payload.note ?? 'Archived through moderation UI.',
            }),
        },
    );

    return mapModerationRecordFromApi(data);
}

function mapModerationRecordFromApi(
    record: AdminResearchApiRecord,
): FlaggedResearchRecord {
    const status = mapModerationStatus(record.status);

    return {
        id: String(record.id),
        title: record.title,
        agency: record.agency?.short_name ?? record.agency?.name ?? 'Agency',
        uploadedBy: record.uploader?.name ?? 'Agency Admin',
        uploaderRole: record.uploader?.role ?? 'agency_admin',
        issueType:
            record.status === 'rejected'
                ? 'policy-violation'
                : 'incomplete-metadata',
        year: record.publication_year ?? new Date().getFullYear(),
        status,
        dateFlagged:
            record.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        abstract: record.abstract ?? undefined,
        authors: record.authors ?? [],
        issueDescription: `Current official status: ${record.status}. Review this relational research record and apply the appropriate moderation action.`,
        recommendedAction:
            record.status === 'approved'
                ? 'Publish approved research when ready.'
                : 'Approve, reject, return, or archive based on governance review.',
    };
}

function mapModerationStatus(
    status: string,
): FlaggedResearchRecord['status'] {
    if (status === 'approved') {
        return 'resolved';
    }

    if (status === 'rejected') {
        return 'flagged';
    }

    return 'pending-review';
}
