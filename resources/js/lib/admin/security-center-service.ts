import {
    mockActiveAdminSessions,
    mockLoginActivity,
    mockSecurityAlerts,
    mockSecurityEvents,
    mockSecuritySummary,
} from '@/data/mock-security-center';
import type {
    GeneratedSecurityReport,
    SecurityReportExportOptions,
} from '@/types/security-center';

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

export async function getSecuritySummary() {
    await mockNetworkDelay();

    return { ...mockSecuritySummary };
}

export async function getSecurityAlerts() {
    await mockNetworkDelay();

    return mockSecurityAlerts.map((alert) => ({ ...alert }));
}

export async function acknowledgeSecurityAlert(id: string) {
    await mockNetworkDelay(160);

    const alert = mockSecurityAlerts.find((item) => item.id === id);

    if (!alert) {
        throw new Error('Security alert was not found.');
    }

    return {
        ...alert,
        status: 'acknowledged' as const,
    };
}

export async function resolveSecurityAlert(id: string) {
    await mockNetworkDelay(160);

    const alert = mockSecurityAlerts.find((item) => item.id === id);

    if (!alert) {
        throw new Error('Security alert was not found.');
    }

    return {
        ...alert,
        status: 'resolved' as const,
    };
}

export async function getLoginActivity() {
    await mockNetworkDelay();

    return mockLoginActivity.map((activity) => ({ ...activity }));
}

export async function getActiveAdminSessions() {
    await mockNetworkDelay();

    return mockActiveAdminSessions.map((session) => ({ ...session }));
}

export async function revokeAdminSession(id: string) {
    await mockNetworkDelay(260);

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
    await mockNetworkDelay();

    return mockSecurityEvents.map((event) => ({ ...event }));
}

export async function exportSecurityReport(
    options: SecurityReportExportOptions,
): Promise<GeneratedSecurityReport> {
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const extension = options.format === 'excel' ? 'xlsx' : options.format;

    return {
        id: `security-report-${Date.now()}`,
        fileName: `rikms-security-report-${generatedAt.slice(0, 10)}.${extension}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}
