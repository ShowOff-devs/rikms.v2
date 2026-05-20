import {
    adminDashboardMetrics,
    pendingModerationItems,
    quickManagementActions,
    researchByAgency,
    researchUploadsByYear,
    securityStatus,
    systemActivityFeed,
} from '@/data/mock-admin-dashboard';
import type { GeneratedSystemReport } from '@/types/admin-dashboard';

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

export async function getAdminDashboardMetrics() {
    await mockNetworkDelay();

    return adminDashboardMetrics;
}

export async function getResearchByAgency() {
    await mockNetworkDelay();

    return researchByAgency;
}

export async function getResearchUploadsByYear() {
    await mockNetworkDelay();

    return researchUploadsByYear;
}

export async function getSystemActivityFeed() {
    await mockNetworkDelay();

    return systemActivityFeed;
}

export async function getPendingModerationItems() {
    await mockNetworkDelay();

    return pendingModerationItems;
}

export async function getSecurityStatus() {
    await mockNetworkDelay();

    return securityStatus;
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
