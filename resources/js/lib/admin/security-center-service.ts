import { fetchApi } from '@/lib/api-client';
import type {
    AdminSession,
    GeneratedSecurityReport,
    LoginActivity,
    SecurityAlert,
    SecurityEvent,
    SecurityReportExportOptions,
    SecuritySummary,
} from '@/types/security-center';

type ApiSecurityEvent = {
    id: number;
    event_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip_address?: string | null;
    user_agent?: string | null;
    location?: string;
    metadata?: Record<string, unknown>;
    resolved_at?: string | null;
    acknowledged_at?: string | null;
    user?: { name?: string; email?: string; role?: string };
    created_at?: string;
};

type ApiAdminSession = {
    id: string;
    user: string;
    role: AdminSession['role'];
    device: string;
    ip_address: string;
    last_activity: string;
    status: AdminSession['status'];
};

type ApiSecuritySummary = {
    mfa_enabled_admin_accounts: number;
    mfa_eligible_admin_accounts: number;
    failed_login_attempts: number;
    locked_accounts: number;
    active_admin_sessions: number;
    security_alerts: number;
};

let cachedEvents: ApiSecurityEvent[] = [];
let eventsRequest: Promise<ApiSecurityEvent[]> | null = null;

function title(value: string) {
    return value
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function eventType(value: string): SecurityEvent['type'] {
    if (value.includes('failed')) {
        return 'login-failed';
    }

    if (value.includes('locked')) {
        return 'account-locked';
    }

    if (value.includes('password')) {
        return 'password-reset';
    }

    if (value.includes('rbac')) {
        return 'rbac-updated';
    }

    if (value.includes('policy')) {
        return 'policy-updated';
    }

    if (value.includes('session')) {
        return 'session-timeout-updated';
    }

    if (value.includes('admin')) {
        return 'admin-created';
    }

    return 'login-success';
}

function toAlert(event: ApiSecurityEvent): SecurityAlert {
    return {
        id: String(event.id),
        title: title(event.event_type),
        description: String(
            event.metadata?.description ??
                event.metadata?.message ??
                title(event.event_type),
        ),
        severity: event.severity,
        status: event.resolved_at
            ? 'resolved'
            : event.acknowledged_at
              ? 'acknowledged'
              : 'open',
        timestamp: event.created_at ?? '',
        source: String(event.metadata?.source ?? 'Security Center'),
        affectedUser: event.user?.name ?? event.user?.email,
        affectedResource: String(event.metadata?.resource ?? ''),
        sourceIp: event.ip_address ?? String(event.metadata?.ip_address ?? ''),
        device: event.user_agent ?? String(event.metadata?.user_agent ?? ''),
        recommendedAction: String(
            event.metadata?.recommended_action ??
                'Review the event and resolve it when verified.',
        ),
    };
}

function toTimelineEvent(event: ApiSecurityEvent): SecurityEvent {
    return {
        id: String(event.id),
        title: title(event.event_type),
        description: String(
            event.metadata?.description ??
                event.metadata?.message ??
                title(event.event_type),
        ),
        timestamp: event.created_at ?? '',
        severity: event.severity,
        actor: event.user?.name ?? 'System',
        type: eventType(event.event_type),
    };
}

async function loadEvents() {
    if (cachedEvents.length) {
        return cachedEvents;
    }

    eventsRequest ??= fetchApi<ApiSecurityEvent[]>(
        '/api/admin/security/events?per_page=100',
    )
        .then((response) => {
            cachedEvents = response.data;

            return cachedEvents;
        })
        .finally(() => {
            eventsRequest = null;
        });

    return eventsRequest;
}

export async function getSecuritySummary(): Promise<SecuritySummary> {
    const response = await fetchApi<ApiSecuritySummary>(
        '/api/admin/security/summary',
    );
    const summary = response.data;

    return {
        mfaEnabledAdminAccounts: summary.mfa_enabled_admin_accounts,
        mfaEligibleAdminAccounts: summary.mfa_eligible_admin_accounts,
        failedLoginAttempts: summary.failed_login_attempts,
        lockedAccounts: summary.locked_accounts,
        activeAdminSessions: summary.active_admin_sessions,
        securityAlerts: summary.security_alerts,
    };
}

export async function getSecurityAlerts() {
    const events = await loadEvents();

    return events.map(toAlert);
}

export async function acknowledgeSecurityAlert(id: string) {
    const response = await fetchApi<ApiSecurityEvent>(
        `/api/admin/security/events/${id}/acknowledge`,
        { method: 'POST' },
    );
    cachedEvents = cachedEvents.map((event) =>
        String(event.id) === id ? response.data : event,
    );

    return toAlert(response.data);
}

export async function resolveSecurityAlert(id: string) {
    const response = await fetchApi<ApiSecurityEvent>(
        `/api/admin/security/events/${id}/resolve`,
        { method: 'POST' },
    );
    cachedEvents = cachedEvents.map((event) =>
        String(event.id) === id ? response.data : event,
    );

    return toAlert(response.data);
}

export async function reopenSecurityAlert(id: string) {
    const response = await fetchApi<ApiSecurityEvent>(
        `/api/admin/security/events/${id}/reopen`,
        { method: 'POST' },
    );
    cachedEvents = cachedEvents.map((event) =>
        String(event.id) === id ? response.data : event,
    );

    return toAlert(response.data);
}

export async function getLoginActivity(): Promise<LoginActivity[]> {
    const events = cachedEvents.length ? cachedEvents : await loadEvents();

    return events
        .filter((event) => event.event_type.includes('login'))
        .map((event) => ({
            id: String(event.id),
            user: event.user?.name ?? 'Unknown',
            role:
                event.user?.role === 'super_admin'
                    ? 'Super Admin'
                    : 'Agency Admin',
            ipAddress: event.ip_address ?? String(event.metadata?.ip_address ?? ''),
            location: event.location ?? 'Unknown',
            device: event.user_agent ?? String(event.metadata?.user_agent ?? ''),
            loginTime: event.created_at ?? '',
            status: event.event_type.includes('failed') ? 'failed' : 'success',
        }));
}

export async function getActiveAdminSessions(): Promise<AdminSession[]> {
    const response = await fetchApi<ApiAdminSession[]>(
        '/api/admin/security/sessions',
    );

    return response.data.map((session) => ({
        id: session.id,
        user: session.user,
        role: session.role,
        device: session.device,
        ipAddress: session.ip_address,
        lastActivity: session.last_activity,
        status: session.status,
    }));
}

export async function revokeAdminSession(id: string) {
    const response = await fetchApi<{ id: string; revoked_at: string }>(
        `/api/admin/security/sessions/${id}`,
        { method: 'DELETE' },
    );

    return {
        id: response.data.id,
        revokedAt: response.data.revoked_at,
    };
}

export async function getSecurityEvents() {
    const events = cachedEvents.length ? cachedEvents : await loadEvents();

    return events.map(toTimelineEvent);
}

export async function exportSecurityReport(
    options: SecurityReportExportOptions,
): Promise<GeneratedSecurityReport> {
    const params = new URLSearchParams();

    params.set('format', options.format);
    params.set('date_range', options.dateRange);

    if (options.startDate) {
        params.set('start_date', options.startDate);
    }

    if (options.endDate) {
        params.set('end_date', options.endDate);
    }

    const response = await fetch(`/api/admin/reports/security/export?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { Accept: 'text/csv', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!response.ok) {
        throw new Error('Unable to export security report.');
    }

    const blob = await response.blob();
    const fileName =
        response.headers
            .get('Content-Disposition')
            ?.match(/filename="?([^"]+)"?/)?.[1] ??
        `rikms-security-report-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return {
        id: `security-report-${Date.now()}`,
        fileName,
        format: options.format,
        generatedAt: new Date().toISOString(),
        status: 'ready',
    };
}
