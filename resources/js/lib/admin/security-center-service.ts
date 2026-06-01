import { mockActiveAdminSessions } from '@/data/mock-security-center';
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
    location?: string;
    metadata?: Record<string, unknown>;
    resolved_at?: string | null;
    user?: { name?: string; email?: string; role?: string };
    created_at?: string;
};

let cachedEvents: ApiSecurityEvent[] = [];

function title(value: string) {
    return value
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function eventType(value: string): SecurityEvent['type'] {
    if (value.includes('failed')) {
return 'login-failed';
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
        description:
            String(event.metadata?.description ?? event.metadata?.message ?? title(event.event_type)),
        severity: event.severity,
        status: event.resolved_at ? 'resolved' : 'open',
        timestamp: event.created_at ?? '',
        source: String(event.metadata?.source ?? 'Security Center'),
        affectedUser: event.user?.name ?? event.user?.email,
        affectedResource: String(event.metadata?.resource ?? ''),
        sourceIp: String(event.metadata?.ip_address ?? ''),
        device: String(event.metadata?.user_agent ?? ''),
        recommendedAction: String(event.metadata?.recommended_action ?? 'Review the event and resolve it when verified.'),
    };
}

function toTimelineEvent(event: ApiSecurityEvent): SecurityEvent {
    return {
        id: String(event.id),
        title: title(event.event_type),
        description: String(event.metadata?.description ?? event.metadata?.message ?? title(event.event_type)),
        timestamp: event.created_at ?? '',
        severity: event.severity,
        actor: event.user?.name ?? 'System',
        type: eventType(event.event_type),
    };
}

async function loadEvents() {
    const response = await fetchApi<ApiSecurityEvent[]>('/api/admin/security/events?per_page=100');
    cachedEvents = response.data;

    return cachedEvents;
}

export async function getSecuritySummary(): Promise<SecuritySummary> {
    const events = cachedEvents.length ? cachedEvents : await loadEvents();
    const failedLoginAttempts = events.filter((event) => event.event_type.includes('failed')).length;

    return {
        mfaEnabledAdminAccounts: 0,
        mfaEligibleAdminAccounts: 0,
        failedLoginAttempts,
        lockedAccounts: events.filter((event) => event.event_type.includes('locked')).length,
        activeAdminSessions: 0,
        securityAlerts: events.filter((event) => !event.resolved_at).length,
    };
}

export async function getSecurityAlerts() {
    const events = await loadEvents();

    return events.map(toAlert);
}

export async function acknowledgeSecurityAlert(id: string) {
    return resolveSecurityAlert(id);
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

export async function getLoginActivity(): Promise<LoginActivity[]> {
    const events = cachedEvents.length ? cachedEvents : await loadEvents();

    return events
        .filter((event) => event.event_type.includes('login'))
        .map((event) => ({
            id: String(event.id),
            user: event.user?.name ?? 'Unknown',
            role: event.user?.role === 'super_admin' ? 'Super Admin' : 'Agency Admin',
            ipAddress: String(event.metadata?.ip_address ?? ''),
            location: event.location ?? 'Unknown',
            device: String(event.metadata?.user_agent ?? ''),
            loginTime: event.created_at ?? '',
            status: event.event_type.includes('failed') ? 'failed' : 'success',
        }));
}

export async function getActiveAdminSessions(): Promise<AdminSession[]> {
    // TODO Phase 9: Replace this mock fallback after a real session tracking/revoke API and authenticated browser automation pass.
    return mockActiveAdminSessions.map((session) => ({ ...session }));
}

export async function revokeAdminSession(id: string) {
    // TODO Phase 9: Replace this mock fallback after a real session tracking/revoke API and authenticated browser automation pass.
    const session = mockActiveAdminSessions.find((item) => item.id === id);

    if (!session) {
        throw new Error('Admin session was not found.');
    }

    return {
        id,
        revokedAt: new Date().toISOString(),
    };
}

export async function getSecurityEvents() {
    const events = cachedEvents.length ? cachedEvents : await loadEvents();

    return events.map(toTimelineEvent);
}

export async function exportSecurityReport(
    options: SecurityReportExportOptions,
): Promise<GeneratedSecurityReport> {
    const response = await fetch('/api/admin/reports/security/export', {
        credentials: 'same-origin',
        headers: { Accept: 'text/csv', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!response.ok) {
        throw new Error('Unable to export security report.');
    }

    return {
        id: `security-report-${Date.now()}`,
        fileName: `rikms-security-report-${new Date().toISOString().slice(0, 10)}.csv`,
        format: options.format,
        generatedAt: new Date().toISOString(),
        status: 'ready',
    };
}
