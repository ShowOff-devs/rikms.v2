import { mockAccessRequestMonitorRecords } from '@/data/mock-access-request-monitor';
import type {
    AccessReportExportOptions,
    AccessRequestAuditPayload,
    AccessRequestExportResult,
    AccessRequestMonitorFilters,
    AccessRequestMonitorRecord,
    AccessRequestMonitorSummary,
    AccessRequestOverridePayload,
} from '@/types/access-request-monitor';

const mockDelay = 250;

function wait(duration = mockDelay) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function cloneRecords() {
    return mockAccessRequestMonitorRecords.map((record) => ({
        ...record,
        auditTrail: record.auditTrail?.map((entry) => ({ ...entry })),
    }));
}

function normalize(value: string | number | undefined) {
    return String(value ?? '').toLowerCase();
}

function isWithinDateRange(
    requestDate: string,
    dateRange: AccessRequestMonitorFilters['dateRange'],
) {
    if (dateRange === 'all') {
        return true;
    }

    const date = new Date(requestDate);
    const now = new Date('2026-05-20T00:00:00+08:00');

    if (dateRange === 'last-7-days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);

        return date >= start;
    }

    if (dateRange === 'last-30-days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);

        return date >= start;
    }

    if (dateRange === 'this-month') {
        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth()
        );
    }

    return date.getFullYear() === now.getFullYear();
}

export function filterAccessRequestMonitorRecords(
    records: AccessRequestMonitorRecord[],
    filters: AccessRequestMonitorFilters,
    topbarSearch = '',
) {
    const queries = [filters.search, topbarSearch]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    return records.filter((record) => {
        const searchableText = [
            record.requesterName,
            record.requesterEmail,
            record.organization,
            record.researchTitle,
            record.agencyShortName,
            record.agencyName,
        ]
            .map(normalize)
            .join(' ');

        const searchMatches = queries.every((query) =>
            searchableText.includes(query),
        );
        const agencyMatches =
            filters.agency === 'all' ||
            record.agencyShortName === filters.agency;
        const statusMatches =
            filters.status === 'all' || record.status === filters.status;
        const organizationMatches =
            filters.organization === 'all' ||
            record.organization === filters.organization;

        return (
            searchMatches &&
            agencyMatches &&
            statusMatches &&
            organizationMatches &&
            isWithinDateRange(record.requestDate, filters.dateRange)
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
) {
    await wait();

    const records = cloneRecords();

    if (!filters) {
        return records;
    }

    return filterAccessRequestMonitorRecords(records, {
        search: filters.search ?? '',
        agency: filters.agency ?? 'all',
        status: filters.status ?? 'all',
        dateRange: filters.dateRange ?? 'all',
        organization: filters.organization ?? 'all',
    });
}

export async function getAccessRequestMonitorSummary(
    filters?: Partial<AccessRequestMonitorFilters>,
) {
    const records = await getAccessRequestMonitorRecords(filters);

    return buildAccessRequestMonitorSummary(records);
}

export async function getAccessRequestById(id: string) {
    await wait(150);

    return cloneRecords().find((record) => record.id === id) ?? null;
}

export async function auditAccessDecision(
    id: string,
    payload?: AccessRequestAuditPayload,
) {
    await wait();

    const record = cloneRecords().find((item) => item.id === id);

    if (!record) {
        throw new Error('Access request not found.');
    }

    return {
        ...record,
        auditStatus: 'reviewed' as const,
        auditTrail: [
            {
                id: `trail-${id}-audit-${Date.now()}`,
                action: 'Decision audit reviewed',
                actor: payload?.actor ?? 'Super Admin',
                timestamp: new Date().toISOString(),
                notes: payload?.notes,
            },
            ...(record.auditTrail ?? []),
        ],
    };
}

export async function overrideAccessRequestDecision(
    id: string,
    payload: AccessRequestOverridePayload,
) {
    await wait(450);

    const record = cloneRecords().find((item) => item.id === id);

    if (!record) {
        throw new Error('Access request not found.');
    }

    return {
        ...record,
        status: 'denied' as const,
        decisionReason: payload.reason,
        reviewedBy: payload.actor ?? 'Super Admin',
        reviewedAt: new Date().toISOString(),
        auditStatus: 'reviewed' as const,
        auditTrail: [
            {
                id: `trail-${id}-override-${Date.now()}`,
                action: 'Decision overridden by Super Admin',
                actor: payload.actor ?? 'Super Admin',
                timestamp: new Date().toISOString(),
                notes: payload.reason,
            },
            ...(record.auditTrail ?? []),
        ],
    };
}

export async function exportAccessRequestReport(
    options: AccessReportExportOptions,
): Promise<AccessRequestExportResult> {
    await wait(650);

    return {
        fileName: `access-request-report-${new Date()
            .toISOString()
            .slice(0, 10)}.${options.format === 'excel' ? 'xlsx' : options.format}`,
        queuedAt: new Date().toISOString(),
        options,
    };
}
