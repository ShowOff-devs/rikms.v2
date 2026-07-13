import { fetchApi } from '@/lib/api-client';
import type {
    AccessRequest,
    EmailNotificationStatus,
} from '@/types/access-request';

type AccessRequestApiRecord = {
    id: number;
    research_id: number;
    requester_name?: string | null;
    requester_email?: string | null;
    purpose?: string | null;
    status: 'pending' | 'approved' | 'denied';
    review_notes?: string | null;
    public_denial_reason?: string | null;
    internal_review_notes?: string | null;
    access_expires_at?: string | null;
    reviewed_at?: string | null;
    research?: {
        title?: string | null;
        agency?: { short_name?: string | null; name?: string | null };
    };
    created_at?: string | null;
};

export type AccessRequestDecisionResult = {
    request: AccessRequest;
    emailNotification: EmailNotificationStatus;
};

export async function approveAgencyAccessRequest(
    id: string,
    notes?: string,
): Promise<AccessRequestDecisionResult> {
    const { data, meta } = await fetchApi<
        AccessRequestApiRecord,
        { email_notification?: EmailNotificationStatus }
    >(`/api/agency/access-requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ internal_notes: notes }),
    });

    return {
        request: mapAccessRequestFromApi(data),
        emailNotification: meta.email_notification ?? 'queued',
    };
}

export async function denyAgencyAccessRequest(
    id: string,
    publicDenialReason: string,
    internalNotes?: string,
): Promise<AccessRequestDecisionResult> {
    const { data, meta } = await fetchApi<
        AccessRequestApiRecord,
        { email_notification?: EmailNotificationStatus }
    >(`/api/agency/access-requests/${id}/deny`, {
        method: 'POST',
        body: JSON.stringify({
            public_denial_reason: publicDenialReason,
            internal_notes: internalNotes,
        }),
    });

    return {
        request: mapAccessRequestFromApi(data),
        emailNotification: meta.email_notification ?? 'queued',
    };
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
        researchTitle:
            record.research?.title ?? `Research #${record.research_id}`,
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
        denialReason:
            record.status === 'denied'
                ? (record.public_denial_reason ?? undefined)
                : undefined,
        internalNotes:
            record.internal_review_notes ?? record.review_notes ?? undefined,
        accessExpiresAt: record.access_expires_at ?? undefined,
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
