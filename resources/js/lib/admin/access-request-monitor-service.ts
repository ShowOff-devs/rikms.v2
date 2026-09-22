import { fetchApi } from '@/lib/api-client';
import { downloadResponseFile } from '@/lib/download-file';
import type {
    AccessReportExportOptions,
    AccessRequestAuditPayload,
    AccessRequestExportResult,
    AccessRequestMonitorFilters,
    AccessRequestMonitorFilterOptions,
    AccessRequestMonitorRecord,
    AccessRequestMonitorSummary,
    AccessRequestOverridePayload,
    AccessRequestsByAgency,
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
    public_denial_reason?: string;
    internal_review_notes?: string;
    access_expires_at?: string;
    reviewed_at?: string;
    audit_status?: 'reviewed' | 'unreviewed';
    audit_reviewed_at?: string;
    processing_duration_seconds?: number;
    reviewer_ip_address?: string;
    reviewer_device?: string;
    audit_trail?: Array<{
        id: string;
        action: string;
        actor: string;
        timestamp: string;
        notes?: string;
    }>;
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
    summary: AccessRequestMonitorSummary;
    pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
    requests_by_agency: AccessRequestsByAgency[];
    filter_options: AccessRequestMonitorFilterOptions;
};

function formatDuration(seconds?: number) {
    if (seconds === undefined || seconds === null) {
        return undefined;
    }

    if (seconds < 60) {
        return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    }

    if (seconds < 3600) {
        const minutes = Math.round(seconds / 60);

        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }

    if (seconds < 86400) {
        const hours = Math.round(seconds / 3600);

        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    const days = Math.round(seconds / 86400);

    return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function toRecord(request: ApiAccessRequest): AccessRequestMonitorRecord {
    const agency = request.research?.agency;

    return {
        id: String(request.id),
        requesterName: request.requester_name ?? 'Public requester',
        requesterEmail: request.requester_email ?? '',
        organization: request.requester_affiliation ?? 'Not provided',
        researchTitle:
            request.research?.title ?? `Research #${request.research_id}`,
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
        decisionReason: request.public_denial_reason ?? request.review_notes,
        reviewerNotes: request.internal_review_notes ?? request.review_notes,
        processingDuration: formatDuration(request.processing_duration_seconds),
        reviewerIpAddress: request.reviewer_ip_address,
        reviewerDevice: request.reviewer_device,
        auditStatus: request.audit_status ?? 'unreviewed',
        auditTrail: request.audit_trail ?? [],
    };
}

function dateRangeParams(
    dateRange: AccessRequestMonitorFilters['dateRange'] | 'custom',
) {
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

function filterParams(
    filters?: Partial<AccessRequestMonitorFilters>,
    page = 1,
    perPage = 8,
) {
    const params = dateRangeParams(filters?.dateRange ?? 'all');

    if (filters?.search) {
        params.set('search', filters.search);
    }

    if (filters?.status && filters.status !== 'all') {
        params.set('status', filters.status);
    }

    if (filters?.agency && filters.agency !== 'all') {
        params.set('agency', filters.agency);
    }

    if (filters?.organization && filters.organization !== 'all') {
        params.set('organization', filters.organization);
    }

    params.set('page', String(page));
    params.set('per_page', String(perPage));

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
            filters.agency === 'all' ||
            record.agencyShortName === filters.agency;
        const matchesStatus =
            filters.status === 'all' || record.status === filters.status;
        const matchesOrganization =
            filters.organization === 'all' ||
            record.organization === filters.organization;

        return (
            matchesSearch &&
            matchesAgency &&
            matchesStatus &&
            matchesOrganization
        );
    });
}

export function buildAccessRequestMonitorSummary(
    records: AccessRequestMonitorRecord[],
): AccessRequestMonitorSummary {
    return {
        total: records.length,
        pending: records.filter((record) => record.status === 'pending').length,
        approved: records.filter((record) => record.status === 'approved')
            .length,
        denied: records.filter((record) => record.status === 'denied').length,
    };
}

export async function getAccessRequestMonitorRecords(
    filters?: Partial<AccessRequestMonitorFilters>,
    page = 1,
    perPage = 8,
) {
    const params = filterParams(filters, page, perPage);
    const response = await fetchApi<ApiAccessRequest[], AccessMonitoringMeta>(
        `/api/admin/access-monitoring?${params.toString()}`,
    );

    return {
        records: response.data.map(toRecord),
        pagination: response.meta.pagination,
        summary: response.meta.summary,
        requestsByAgency: response.meta.requests_by_agency,
        filterOptions: response.meta.filter_options,
    };
}

export async function getAccessRequestMonitorSummary(
    filters?: Partial<AccessRequestMonitorFilters>,
) {
    const params = filterParams(filters, 1, 1);
    const response = await fetchApi<ApiAccessRequest[], AccessMonitoringMeta>(
        `/api/admin/access-monitoring?${params.toString()}`,
    );

    return response.meta.summary;
}

export async function getAccessRequestById(id: string) {
    const response = await fetchApi<ApiAccessRequest>(
        `/api/admin/access-requests/${id}`,
    );

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
    filters?: Partial<AccessRequestMonitorFilters>,
): Promise<AccessRequestExportResult> {
    const params = dateRangeParams(options.dateRange);

    params.set('format', options.format);

    if (options.startDate) {
        params.set('date_from', options.startDate);
    }

    if (options.endDate) {
        params.set('date_to', options.endDate);
    }

    const selectedStatuses = [
        options.includeApproved ? 'approved' : null,
        options.includePending ? 'pending' : null,
        options.includeDenied ? 'denied' : null,
    ].filter(Boolean);

    if (selectedStatuses.length) {
        params.set('statuses', selectedStatuses.join(','));
    }

    if (options.includeCurrentFilters && filters) {
        filterParams(filters).forEach((value, key) => {
            if (key !== 'page' && key !== 'per_page' && !params.has(key)) {
                params.set(key, value);
            }
        });
    }

    const response = await fetch(
        `/api/admin/access-monitoring/export?${params}`,
        {
            credentials: 'same-origin',
            headers: {
                Accept: 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) {
        throw new Error('Unable to export access request report.');
    }

    const { fileName } = await downloadResponseFile(
        response,
        `access-monitoring-${new Date().toISOString().slice(0, 10)}.csv`,
    );

    return {
        fileName,
        queuedAt: new Date().toISOString(),
        options,
    };
}
