import {
    approveAgencyAccessRequest,
    denyAgencyAccessRequest,
    mapAccessRequestFromApi,
} from '@/lib/agency/agency-access-request-service';
import { fetchApi } from '@/lib/api-client';
import type {
    AccessRequest,
    AccessRequestDateFilter,
    AccessRequestFilters,
    EmailNotificationStatus,
} from '@/types/access-request';

type AccessRequestApiRecord = Parameters<typeof mapAccessRequestFromApi>[0];

let accessRequests: AccessRequest[] = [];

export type AccessRequestDecisionResult = {
    request: AccessRequest | null;
    emailNotification: EmailNotificationStatus;
};

const cloneRequests = (requests: AccessRequest[]) =>
    requests.map((request) => ({ ...request }));

const parseRequestDate = (requestDate: string) =>
    new Date(`${requestDate} UTC`);

const matchesDateFilter = (
    request: AccessRequest,
    dateFilter: AccessRequestDateFilter,
) => {
    if (dateFilter === 'all') {
        return true;
    }

    const date = parseRequestDate(request.requestDate);

    if (dateFilter === 'march-2025') {
        return date.getUTCFullYear() === 2025 && date.getUTCMonth() === 2;
    }

    return date.getUTCFullYear() === 2025 && date.getUTCMonth() === 1;
};

export async function getAccessRequests() {
    const { data } = await fetchApi<AccessRequestApiRecord[]>(
        '/api/agency/access-requests?per_page=100',
    );

    accessRequests = data.map(mapAccessRequestFromApi);

    return cloneRequests(accessRequests);
}

export function searchAccessRequests(
    requests: AccessRequest[],
    search: string,
) {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
        return requests;
    }

    return requests.filter((request) =>
        [
            request.requesterName,
            request.requesterEmail,
            request.organization,
            request.researchTitle,
        ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
    );
}

export function filterAccessRequests(
    requests: AccessRequest[],
    filters: AccessRequestFilters,
) {
    return searchAccessRequests(requests, filters.search).filter((request) => {
        const statusMatches =
            filters.status === 'all' || request.status === filters.status;
        const organizationMatches =
            filters.organization === 'all' ||
            request.organization === filters.organization;

        return (
            statusMatches &&
            organizationMatches &&
            matchesDateFilter(request, filters.date)
        );
    });
}

export async function approveAccessRequest(
    id: string,
): Promise<AccessRequestDecisionResult> {
    const { request: updated, emailNotification } =
        await approveAgencyAccessRequest(id);
    accessRequests = accessRequests.map((request) =>
        request.id === id ? updated : request,
    );

    return {
        request: await getAccessRequestById(id),
        emailNotification,
    };
}

export async function denyAccessRequest(
    id: string,
    publicReason: string,
    internalNotes?: string,
): Promise<AccessRequestDecisionResult> {
    const { request: updated, emailNotification } =
        await denyAgencyAccessRequest(id, publicReason, internalNotes);
    accessRequests = accessRequests.map((request) =>
        request.id === id ? updated : request,
    );

    return {
        request: await getAccessRequestById(id),
        emailNotification,
    };
}

export function getAccessRequestDecisionMessage(
    decision: 'approved' | 'denied',
    emailNotification: EmailNotificationStatus,
) {
    if (decision === 'approved') {
        if (emailNotification === 'skipped') {
            return 'Access request saved, but no email was queued because the requester does not have a valid email address.';
        }

        if (emailNotification === 'failed_to_queue') {
            return 'Access request saved, but the email notification could not be queued. Please check the mail and queue configuration.';
        }

        return 'Access request approved. The requester’s email notification has been queued for delivery.';
    }

    if (emailNotification === 'skipped') {
        return 'Access request saved, but no email was queued because the requester does not have a valid email address.';
    }

    if (emailNotification === 'failed_to_queue') {
        return 'Access request saved, but the email notification could not be queued. Please check the mail and queue configuration.';
    }

    return 'Access request denied. The requester’s email notification has been queued for delivery.';
}

export async function getAccessRequestById(id: string) {
    const request = accessRequests.find((item) => item.id === id);

    return request ? { ...request } : null;
}
