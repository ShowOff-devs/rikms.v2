import { fetchApi } from '@/lib/api-client';
import type {
    AdminDashboardIcon,
    AdminDashboardMetric,
    GeneratedSystemReport,
    ModerationItem,
    QuickManagementAction,
    ResearchByAgency,
    ResearchUploadByYear,
    SecurityStatus,
    SystemActivity,
} from '@/types/admin-dashboard';

type AdminDashboardMetrics = {
    total_agencies: number;
    active_agencies: number;
    inactive_agencies: number;
    total_users: number;
    active_users: number;
    agency_admin_users: number;
    super_admin_users: number;
    total_research: number;
    draft_research: number;
    submitted_research: number;
    under_review_research: number;
    approved_research: number;
    published_research: number;
    archived_research: number;
    pending_research_approvals: number;
    total_access_requests: number;
    approved_access_requests: number;
    denied_access_requests: number;
    pending_access_requests: number;
    pending_moderation_count: number;
    total_uploads: number;
    total_files: number;
    unread_notifications_count: number;
    total_security_events: number;
    unresolved_security_events: number;
    recent_failed_logins: number;
    locked_accounts: number;
    mfa_enabled_users: number;
    mfa_eligible_users: number;
};

type DashboardAuditLog = {
    id: number;
    event: string;
    target?: string | null;
    created_at?: string | null;
    user?: { name?: string | null } | null;
    agency?: { short_name?: string | null; name?: string | null } | null;
};

type DashboardModerationItem = {
    id: string;
    title: string;
    agency: string;
    issue_type: ModerationItem['issueType'];
    severity: ModerationItem['severity'];
    status_label: string;
};

type AdminDashboardApiData = {
    metrics: AdminDashboardMetrics;
    recent_research: Array<Record<string, unknown>>;
    recent_agencies: Array<Record<string, unknown>>;
    recent_audit_logs: DashboardAuditLog[];
    recent_security_events: Array<Record<string, unknown>>;
    pending_moderation_items: DashboardModerationItem[];
    research_by_agency: ResearchByAgency[];
    research_uploads_by_year: ResearchUploadByYear[];
    security_status: {
        mfa_enabled_accounts: number;
        mfa_eligible_accounts: number;
        recent_failed_logins: number;
        locked_accounts: number;
        security_alerts: number;
    };
};

let dashboardRequest: Promise<AdminDashboardApiData> | null = null;

const quickManagementActions: QuickManagementAction[] = [
    {
        id: 'create-new-agency',
        label: 'Create New Agency',
        route: '/admin/agencies',
        icon: 'building',
    },
    {
        id: 'manage-admin-users',
        label: 'Manage Admin Users',
        route: '/admin/users',
        icon: 'users',
    },
    {
        id: 'view-system-research',
        label: 'View System Research',
        route: '/admin/research',
        icon: 'file-text',
    },
    {
        id: 'open-activity-logs',
        label: 'Open Activity Logs',
        route: '/admin/audit-logs',
        icon: 'activity',
    },
    {
        id: 'manage-rbac-roles',
        label: 'Manage RBAC Roles',
        route: '/admin/rbac',
        icon: 'shield',
    },
    {
        id: 'open-security-center',
        label: 'Open Security Center',
        route: '/admin/security',
        icon: 'lock',
    },
];

async function getAdminDashboardApiData() {
    dashboardRequest ??= fetchApi<AdminDashboardApiData>(
        '/api/admin/dashboard',
    ).then(({ data }) => data);

    return dashboardRequest;
}

function dashboardMetric(
    id: string,
    label: string,
    value: number,
    icon: AdminDashboardIcon,
    helperText?: string,
): AdminDashboardMetric {
    return {
        id,
        label,
        value,
        icon,
        helperText,
    };
}

export async function getAdminDashboardMetrics() {
    const data = await getAdminDashboardApiData();

    return [
        dashboardMetric(
            'total-research-records',
            'Total Research Records',
            data.metrics.total_research,
            'file-text',
            `${data.metrics.published_research} published`,
        ),
        dashboardMetric(
            'participating-agencies',
            'Participating Agencies',
            data.metrics.total_agencies,
            'building',
            `${data.metrics.active_agencies} active`,
        ),
        dashboardMetric(
            'agency-admin-users',
            'Agency Admin Users',
            data.metrics.agency_admin_users,
            'users',
            `${data.metrics.active_users} active users`,
        ),
        dashboardMetric(
            'published-research',
            'Published Research',
            data.metrics.published_research,
            'bar-chart',
        ),
        dashboardMetric(
            'pending-access-requests',
            'Pending Access Requests',
            data.metrics.pending_access_requests,
            'clipboard',
            `${data.metrics.total_access_requests} total`,
        ),
        dashboardMetric(
            'pending-moderation',
            'Pending Moderation',
            data.metrics.pending_moderation_count,
            'activity',
            `${data.metrics.pending_research_approvals} approval records`,
        ),
        dashboardMetric(
            'uploaded-files',
            'Uploaded Files',
            data.metrics.total_files,
            'archive',
        ),
        dashboardMetric(
            'security-events',
            'Security Events',
            data.metrics.unresolved_security_events,
            'lock',
            `${data.metrics.total_security_events} total`,
        ),
    ];
}

export async function getResearchByAgency() {
    const data = await getAdminDashboardApiData();

    return data.research_by_agency;
}

export async function getResearchUploadsByYear() {
    const data = await getAdminDashboardApiData();

    return data.research_uploads_by_year;
}

export async function getSystemActivityFeed() {
    const data = await getAdminDashboardApiData();

    return data.recent_audit_logs.map<SystemActivity>((log) => ({
        id: String(log.id),
        actor: log.user?.name ?? 'System',
        agency: log.agency?.short_name ?? log.agency?.name ?? undefined,
        action: log.event,
        target: log.target ?? 'System record',
        timestamp: log.created_at ?? new Date().toISOString(),
        type: 'system',
    }));
}

export async function getPendingModerationItems() {
    const data = await getAdminDashboardApiData();

    return data.pending_moderation_items.map<ModerationItem>((item) => ({
        id: item.id,
        title: item.title,
        agency: item.agency,
        issueType: item.issue_type,
        severity: item.severity,
        statusLabel: item.status_label,
    }));
}

export async function getSecurityStatus() {
    const data = await getAdminDashboardApiData();
    const status: SecurityStatus = {
        mfaEnabledAccounts: data.security_status.mfa_enabled_accounts,
        mfaEligibleAccounts: data.security_status.mfa_eligible_accounts,
        recentFailedLogins: data.security_status.recent_failed_logins,
        lockedAccounts: data.security_status.locked_accounts,
        securityAlerts: data.security_status.security_alerts,
    };

    return status;
}

export async function getQuickManagementActions() {
    return quickManagementActions;
}

export async function generateSystemReport(): Promise<GeneratedSystemReport> {
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
