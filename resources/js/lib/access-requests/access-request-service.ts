import { mockAccessRequests } from '@/data/mock-access-requests';
import type {
    AccessRequest,
    AccessRequestDateFilter,
    AccessRequestFilters,
} from '@/types/access-request';

let accessRequests = mockAccessRequests.map((request) => ({ ...request }));

const mockNetworkDelay = (duration = 160) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

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
    await mockNetworkDelay();

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

export async function approveAccessRequest(id: string) {
    await mockNetworkDelay();

    accessRequests = accessRequests.map((request) =>
        request.id === id
            ? {
                  ...request,
                  status: 'approved',
                  denialReason: undefined,
                  processedAt: 'Mar 6, 2025',
                  processedBy: 'Agency Admin',
              }
            : request,
    );

    return getAccessRequestById(id);
}

export async function denyAccessRequest(id: string, reason?: string) {
    await mockNetworkDelay();

    accessRequests = accessRequests.map((request) =>
        request.id === id
            ? {
                  ...request,
                  status: 'denied',
                  denialReason: reason,
                  processedAt: 'Mar 6, 2025',
                  processedBy: 'Agency Admin',
              }
            : request,
    );

    return getAccessRequestById(id);
}

export async function getAccessRequestById(id: string) {
    await mockNetworkDelay(40);

    const request = accessRequests.find((item) => item.id === id);

    return request ? { ...request } : null;
}
