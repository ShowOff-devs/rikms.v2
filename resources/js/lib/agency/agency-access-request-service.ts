import { fetchApi } from '@/lib/api-client';
import type { AccessRequest } from '@/types/access-request';

type AccessRequestApiRecord = {
    id: number;
    research_id: number;
    requester_name?: string | null;
    requester_email?: string | null;
    purpose?: string | null;
    status: 'pending' | 'approved' | 'denied';
    review_notes?: string | null;
    reviewed_at?: string | null;
    research?: {
        title?: string | null;
        agency?: { short_name?: string | null; name?: string | null };
    };
    created_at?: string | null;
};

export async function approveAgencyAccessRequest(
    id: string,
    notes?: string,
) {
    const { data } = await fetchApi<AccessRequestApiRecord>(
        `/api/agency/access-requests/${id}/approve`,
        {
            method: 'POST',
            body: JSON.stringify({ decision_notes: notes }),
        },
    );

    return mapAccessRequestFromApi(data);
}

export async function denyAgencyAccessRequest(id: string, notes?: string) {
    const { data } = await fetchApi<AccessRequestApiRecord>(
        `/api/agency/access-requests/${id}/deny`,
        {
            method: 'POST',
            body: JSON.stringify({ decision_notes: notes }),
        },
    );

    return mapAccessRequestFromApi(data);
}

export function mapAccessRequestFromApi(
    record: AccessRequestApiRecord,
): AccessRequest {
    const createdAt = record.created_at ? new Date(record.created_at) : null;
    const reviewedAt = record.reviewed_at ? new Date(record.reviewed_at) : null;

    return {
        id: String(record.id),
        requesterName: record.requester_name ?? 'Requester',
        requesterEmail: record.requester_email ?? '',
        organization:
            record.research?.agency?.short_name ??
            record.research?.agency?.name ??
            'Agency',
        researchTitle: record.research?.title ?? `Research #${record.research_id}`,
        researchId: String(record.research_id),
        requestDate: createdAt
            ? createdAt.toLocaleDateString('en', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
              })
            : 'Not available',
        status: record.status,
        requestMessage: record.purpose ?? undefined,
        denialReason: record.status === 'denied' ? record.review_notes ?? undefined : undefined,
        processedAt: reviewedAt
            ? reviewedAt.toLocaleDateString('en', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
              })
            : undefined,
        processedBy: reviewedAt ? 'Agency Admin' : undefined,
    };
}
