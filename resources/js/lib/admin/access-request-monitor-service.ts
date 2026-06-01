import { fetchApi } from '@/lib/api-client';
import type {
    AccessReportExportOptions,
    AccessRequestAuditPayload,
    AccessRequestExportResult,
    AccessRequestMonitorFilters,
    AccessRequestMonitorRecord,
    AccessRequestMonitorSummary,
    AccessRequestOverridePayload,
} from '@/types/access-request-monitor';

type ApiAccessRequest = {
    id: number;
    research_id: number;
    agency_id?: number;
    requester_name?: string;
    requester_email?: string;
    requester_affiliation?: string;
    purpose?: string;
    message?: string;
    intended_use?: string;
    status: 'approved' | 'pending' | 'denied';
    requested_at?: string;
    review_notes?: string;
    reviewed_at?: string;
    research?: {
        id: number;
        title: string;
        access_level?: string;
        agency?: {
            id: number;
            name: string;
            short_name?: string;
        };
    };
    reviewer?: {
        name?: string;
        email?: string;
    };
    created_at?: string;
};

type AccessMonitoringMeta = {
    summary?: AccessRequestMonitorSummary;
};

function toRecord(request: ApiAccessRequest): AccessRequestMonitorRecord {
    const agency = request.research?.agency;

    return {
        id: String(request.id),
        requesterName: request.requester_name ?? 'Public requester',
        requesterEmail: request.requester_email ?? '',
        organization: request.requester_affiliation ?? 'Not provided',
        researchTitle: request.research?.title ?? `Research #${request.research_id}`,
        researchId: String(request.research_id),
        agencyId: String(agency?.id ?? request.agency_id ?? ''),
        agencyShortName: agency?.short_name ?? agency?.name ?? 'Unassigned',
        agencyName: agency?.name ?? 'Unassigned agency',
        requestDate: request.requested_at ?? request.created_at ?? '',
        status: request.status,
        reviewedBy: request.reviewer?.name ?? request.reviewer?.email,
        reviewedAt: request.reviewed_at,
        requestMessage: request.message ?? request.purpose,
        requestedAccessType: request.intended_use,
        researchAccessPolicy: request.research?.access_level,
        decisionReason: request.review_notes,
        reviewerNotes: request.review_notes,
        auditStatus: request.reviewed_at ? 'reviewed' : 'unreviewed',
        auditTrail: [],
    };
}

function dateRangeParams(dateRange: AccessRequestMonitorFilters['dateRange']) {
    const now = new Date();
    const params = new URLSearchParams();

    if (dateRange === 'all') {
        return params;
    }

    const start = new Date(now);

    if (dateRange === 'last-7-days') {
        start.setDate(now.getDate() - 7);
    } else if (dateRange === 'last-30-days') {
        start.setDate(now.getDate() - 30);
    } else if (dateRange === 'this-month') {
        start.setDate(1);
    } else {
        start.setMonth(0, 1);
    }

    params.set('date_from', start.toISOString().slice(0, 10));

    return params;
}

function filterParams(filters?: Partial<AccessRequestMonitorFilters>) {
    const params = dateRangeParams(filters?.dateRange ?? 'all');

    if (filters?.search) {
        params.set('search', filters.search);
    }

    if (filters?.status && filters.status !== 'all') {
        params.set('status', filters.status);
    }

    if (filters?.agency && filters.agency !== 'all') {
        params.set('search', [params.get('search'), filters.agency].filter(Boolean).join(' '));
    }

    params.set('per_page', '100');

    return params;
}

export function filterAccessRequestMonitorRecords(
    records: AccessRequestMonitorRecord[],
    filters: AccessRequestMonitorFilters,
    topbarSearch = '',
) {
    const query = [filters.search, topbarSearch].join(' ').trim().toLowerCase();

    return records.filter((record) => {
        const matchesSearch =
            !query ||
            [
                record.requesterName,
                record.requesterEmail,
                record.organization,
                record.researchTitle,
                record.agencyShortName,
                record.agencyName,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query);
        const matchesAgency =
            filters.agency === 'all' || record.agencyShortName === filters.agency;
        const matchesStatus =
            filters.status === 'all' || record.status === filters.status;
        const matchesOrganization =
            filters.organization === 'all' || record.organization === filters.organization;

        return matchesSearch && matchesAgency && matchesStatus && matchesOrganization;
    });
}

export function buildAccessRequestMonitorSummary(
    records: AccessRequestMonitorRecord[],
): AccessRequestMonitorSummary {
    return {
        total: records.length,
        pending: records.filter((record) => record.status === 'pending').length,
        approved: records.filter((record) => record.status === 'approved').length,
        denied: records.filter((record) => record.status === 'denied').length,
    };
}

export async function getAccessRequestMonitorRecords(
    filters?: Partial<AccessRequestMonitorFilters>,
) {
    const params = filterParams(filters);
    const response = await fetchApi<ApiAccessRequest[]>(
        `/api/admin/access-monitoring?${params.toString()}`,
    );

    return response.data.map(toRecord);
}

export async function getAccessRequestMonitorSummary(
    filters?: Partial<AccessRequestMonitorFilters>,
) {
    const params = filterParams(filters);
    const response = await fetchApi<ApiAccessRequest[], AccessMonitoringMeta>(
        `/api/admin/access-monitoring?${params.toString()}`,
    );

    return response.meta.summary ?? buildAccessRequestMonitorSummary(response.data.map(toRecord));
}

export async function getAccessRequestById(id: string) {
    const response = await fetchApi<ApiAccessRequest>(`/api/admin/access-requests/${id}`);

    return toRecord(response.data);
}

export async function auditAccessDecision(
    id: string,
    payload?: AccessRequestAuditPayload,
) {
    const response = await fetchApi<ApiAccessRequest>(
        `/api/admin/access-requests/${id}/audit-reviewed`,
        {
            method: 'POST',
            body: JSON.stringify({ notes: payload?.notes }),
        },
    );

    return { ...toRecord(response.data), auditStatus: 'reviewed' as const };
}

export async function overrideAccessRequestDecision(
    id: string,
    payload: AccessRequestOverridePayload,
) {
    const response = await fetchApi<ApiAccessRequest>(
        `/api/admin/access-requests/${id}/override-deny`,
        {
            method: 'POST',
            body: JSON.stringify({ reason: payload.reason }),
        },
    );

    return toRecord(response.data);
}

export async function exportAccessRequestReport(
    options: AccessReportExportOptions,
): Promise<AccessRequestExportResult> {
    const response = await fetch('/api/admin/access-monitoring/export', {
        credentials: 'same-origin',
        headers: { Accept: 'text/csv', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!response.ok) {
        throw new Error('Unable to export access request report.');
    }

    return {
        fileName: `access-monitoring-${new Date().toISOString().slice(0, 10)}.csv`,
        queuedAt: new Date().toISOString(),
        options,
    };
}
