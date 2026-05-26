import {
    agencyAccessRequests,
    agencyResearchRecords,
    dashboardMetrics,
    researchByCategory,
    researchByYear,
} from '@/data/mock-agency-dashboard';
import { fetchApi } from '@/lib/api-client';
import type {
    AccessRequestStatus,
    AgencyAccessRequest,
    AgencyResearchRecord,
} from '@/types/agency-dashboard';

type AgencyDashboardApiData = {
    metrics: {
        total_research: number;
        published_research: number;
        draft_research: number;
        pending_access_requests: number;
    };
    research_by_year: Array<{ year: number; count: number }>;
    research_by_category: Array<{ category: string; count: number }>;
    recent_research: Array<{
        id: number;
        slug?: string | null;
        title: string;
        authors: string[] | string;
        publication_year?: number | null;
        category?: string | null;
        status: string;
        updated_at?: string | null;
    }>;
};

type AgencyAccessRequestsApiData = Array<{
    id: number;
    requester_name?: string | null;
    requester_email?: string | null;
    status: string;
    created_at?: string | null;
    research?: {
        title?: string | null;
        agency?: {
            short_name?: string | null;
            name?: string | null;
        };
    };
}>;

const mockNetworkDelay = (duration = 200) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

export async function getAgencyDashboardData() {
    try {
        const [{ data }, requests] = await Promise.all([
            fetchApi<AgencyDashboardApiData>('/api/agency/dashboard'),
            getAgencyAccessRequests(),
        ]);

        return {
            metrics: [
                {
                    id: 'total-research',
                    label: 'Total Research',
                    value: data.metrics.total_research,
                    tone: 'blue' as const,
                },
                {
                    id: 'draft-research',
                    label: 'Draft Research',
                    value: data.metrics.draft_research,
                    tone: 'amber' as const,
                },
                {
                    id: 'published-research',
                    label: 'Published',
                    value: data.metrics.published_research,
                    tone: 'green' as const,
                },
                {
                    id: 'pending-requests',
                    label: 'Pending Requests',
                    value: data.metrics.pending_access_requests,
                    tone: 'slate' as const,
                },
            ],
            researchByYear:
                data.research_by_year.length > 0
                    ? data.research_by_year
                    : researchByYear,
            researchByCategory:
                data.research_by_category.length > 0
                    ? data.research_by_category.map((item, index) => ({
                          ...item,
                          color:
                              ['#1e3a8a', '#009966', '#f97316', '#64748b'][
                                  index % 4
                              ],
                      }))
                    : researchByCategory,
            researchRecords: data.recent_research.map((record) =>
                mapResearchRecord(record),
            ),
            accessRequests: requests,
        };
    } catch {
        await mockNetworkDelay();

        return {
            metrics: dashboardMetrics,
            researchByYear,
            researchByCategory,
            researchRecords: agencyResearchRecords,
            accessRequests: agencyAccessRequests,
        };
    }
}

export async function getAgencyAccessRequests() {
    try {
        const { data } = await fetchApi<AgencyAccessRequestsApiData>(
            '/api/agency/access-requests?status=pending&per_page=5',
        );

        return data.map((request) => ({
            id: String(request.id),
            requesterName: request.requester_name ?? 'Unknown requester',
            organization:
                request.research?.agency?.short_name ??
                request.research?.agency?.name ??
                request.requester_email ??
                'External requester',
            researchTitle: request.research?.title ?? 'Untitled research',
            requestDate: formatDate(request.created_at),
            status: mapAccessRequestStatus(request.status),
        }));
    } catch {
        await mockNetworkDelay();

        return agencyAccessRequests;
    }
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

function mapResearchRecord(record: AgencyDashboardApiData['recent_research'][number]): AgencyResearchRecord {
    const authors = Array.isArray(record.authors)
        ? record.authors.join(', ')
        : record.authors;

    return {
        id: String(record.id),
        repositoryId: String(record.id),
        title: record.title,
        authors,
        year: record.publication_year ?? new Date().getFullYear(),
        category: record.category ?? 'Uncategorized',
        status: mapResearchStatus(record.status),
        lastUpdated: formatDate(record.updated_at),
    };
}

function mapResearchStatus(status: string): AgencyResearchRecord['status'] {
    if (status === 'published' || status === 'archived') {
        return status;
    }

    return 'draft';
}

function mapAccessRequestStatus(status: string): AccessRequestStatus {
    if (status === 'approved' || status === 'denied') {
        return status;
    }

    return 'pending';
}

function formatDate(value?: string | null) {
    if (!value) {
        return new Date().toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
}
