import {
    agencyAccessRequests,
    agencyResearchRecords,
    dashboardMetrics,
    researchByCategory,
    researchByYear,
} from '@/data/mock-agency-dashboard';
import type {
    AccessRequestStatus,
    AgencyAccessRequest,
    AgencyResearchRecord,
} from '@/types/agency-dashboard';

const mockNetworkDelay = (duration = 200) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

export async function getAgencyDashboardData() {
    await mockNetworkDelay();

    return {
        metrics: dashboardMetrics,
        researchByYear,
        researchByCategory,
        researchRecords: agencyResearchRecords,
        accessRequests: agencyAccessRequests,
    };
}

export async function getAgencyAccessRequests() {
    await mockNetworkDelay();

    return agencyAccessRequests;
}

export function filterAgencyResearchRecords(
    records: AgencyResearchRecord[],
    search: string,
) {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
        return records;
    }

    return records.filter((record) =>
        [
            record.title,
            record.authors,
            record.category,
            record.status,
            String(record.year),
            record.lastUpdated,
        ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
    );
}

export function updateAccessRequestStatus(
    requests: AgencyAccessRequest[],
    requestId: string,
    status: AccessRequestStatus,
) {
    return requests.map((request) =>
        request.id === requestId ? { ...request, status } : request,
    );
}
