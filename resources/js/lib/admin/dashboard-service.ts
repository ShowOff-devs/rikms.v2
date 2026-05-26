import {
    adminDashboardMetrics,
    pendingModerationItems,
    quickManagementActions,
    researchByAgency,
    researchUploadsByYear,
    securityStatus,
    systemActivityFeed,
} from '@/data/mock-admin-dashboard';
import { fetchApi } from '@/lib/api-client';
import type { GeneratedSystemReport } from '@/types/admin-dashboard';

type AdminDashboardApiData = {
    metrics: {
        total_agencies: number;
        active_agencies: number;
        total_users: number;
        total_research: number;
        published_research: number;
        pending_research_approvals: number;
        pending_access_requests: number;
        unresolved_security_events: number;
    };
    recent_audit_logs: Array<{
        id: number;
        event: string;
        created_at?: string | null;
        user?: { name?: string | null };
        agency?: { short_name?: string | null; name?: string | null };
        metadata?: Record<string, unknown>;
    }>;
    recent_security_events: Array<{
        id: number;
        event_type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        created_at?: string | null;
    }>;
    research_by_agency: Array<{ agency: string; count: number }>;
    research_uploads_by_year: Array<{ year: number; count: number }>;
};

let dashboardRequest: Promise<AdminDashboardApiData> | null = null;

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

async function getAdminDashboardApiData() {
    dashboardRequest ??= fetchApi<AdminDashboardApiData>(
        '/api/admin/dashboard',
    ).then(({ data }) => data);

    return dashboardRequest;
}

export async function getAdminDashboardMetrics() {
    try {
        const data = await getAdminDashboardApiData();

        return [
            {
                id: 'total-agencies',
                label: 'Total Agencies',
                value: data.metrics.total_agencies,
                helperText: `${data.metrics.active_agencies} active`,
                icon: 'building' as const,
            },
            {
                id: 'total-users',
                label: 'Total Users',
                value: data.metrics.total_users,
                icon: 'users' as const,
            },
            {
                id: 'total-research',
                label: 'Research Records',
                value: data.metrics.total_research,
                helperText: `${data.metrics.published_research} published`,
                icon: 'file-text' as const,
            },
            {
                id: 'pending-actions',
                label: 'Pending Reviews',
                value:
                    data.metrics.pending_research_approvals +
                    data.metrics.pending_access_requests,
                icon: 'clipboard' as const,
            },
        ];
    } catch {
        await mockNetworkDelay();

        return adminDashboardMetrics;
    }
}

export async function getResearchByAgency() {
    try {
        const data = await getAdminDashboardApiData();

        return data.research_by_agency.length > 0
            ? data.research_by_agency
            : researchByAgency;
    } catch {
        await mockNetworkDelay();

        return researchByAgency;
    }
}

export async function getResearchUploadsByYear() {
    try {
        const data = await getAdminDashboardApiData();

        return data.research_uploads_by_year.length > 0
            ? data.research_uploads_by_year
            : researchUploadsByYear;
    } catch {
        await mockNetworkDelay();

        return researchUploadsByYear;
    }
}

export async function getSystemActivityFeed() {
    try {
        const data = await getAdminDashboardApiData();

        return data.recent_audit_logs.map((log) => ({
            id: String(log.id),
            actor: log.user?.name ?? 'System',
            agency: log.agency?.short_name ?? log.agency?.name ?? undefined,
            action: log.event,
            target: String(log.metadata?.target ?? 'System record'),
            timestamp: log.created_at ?? new Date().toISOString(),
            type: 'system' as const,
        }));
    } catch {
        await mockNetworkDelay();

        return systemActivityFeed;
    }
}

export async function getPendingModerationItems() {
    await mockNetworkDelay();

    return pendingModerationItems;
}

export async function getSecurityStatus() {
    try {
        const data = await getAdminDashboardApiData();

        return {
            mfaEnabledAccounts: securityStatus.mfaEnabledAccounts,
            mfaEligibleAccounts: securityStatus.mfaEligibleAccounts,
            recentFailedLogins: data.recent_security_events.filter(
                (event) => event.event_type === 'login.failed',
            ).length,
            lockedAccounts: data.recent_security_events.filter(
                (event) => event.event_type === 'account.locked',
            ).length,
            securityAlerts: data.metrics.unresolved_security_events,
        };
    } catch {
        await mockNetworkDelay();

        return securityStatus;
    }
}

export async function getQuickManagementActions() {
    await mockNetworkDelay();

    return quickManagementActions;
}

export async function generateSystemReport(): Promise<GeneratedSystemReport> {
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const dateStamp = generatedAt.slice(0, 10);

    return {
        id: `system-report-${Date.now()}`,
        fileName: `rikms-system-report-${dateStamp}.pdf`,
        format: 'pdf',
        generatedAt,
        status: 'ready',
    };
}
