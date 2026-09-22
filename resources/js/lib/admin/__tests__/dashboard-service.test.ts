import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    getAdminDashboardMetrics,
    getSecurityStatus,
} from '@/lib/admin/dashboard-service';

function dashboardResponse() {
    return new Response(
        JSON.stringify({
            message: 'Admin dashboard loaded successfully.',
            data: {
                metrics: {
                    total_agencies: 1,
                    active_agencies: 1,
                    inactive_agencies: 0,
                    total_users: 2,
                    active_users: 2,
                    agency_admin_users: 1,
                    super_admin_users: 1,
                    total_research: 4,
                    draft_research: 1,
                    submitted_research: 1,
                    under_review_research: 0,
                    approved_research: 0,
                    published_research: 2,
                    archived_research: 0,
                    pending_research_approvals: 0,
                    total_access_requests: 0,
                    approved_access_requests: 0,
                    denied_access_requests: 0,
                    pending_access_requests: 0,
                    pending_moderation_count: 1,
                    total_uploads: 4,
                    total_files: 4,
                    unread_notifications_count: 0,
                    total_security_events: 0,
                    unresolved_security_events: 0,
                    recent_failed_logins: 0,
                    locked_accounts: 0,
                    mfa_enabled_users: 1,
                    mfa_eligible_users: 2,
                },
                recent_audit_logs: [],
                pending_moderation_items: [],
                research_by_agency: [],
                research_uploads_by_year: [],
                security_status: {
                    mfa_enabled_accounts: 1,
                    mfa_eligible_accounts: 2,
                    recent_failed_logins: 0,
                    locked_accounts: 0,
                    security_alerts: 0,
                },
            },
            meta: {},
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        },
    );
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('admin dashboard request lifecycle', () => {
    it('deduplicates concurrent consumers but refreshes later visits', async () => {
        const fetchMock = vi
            .fn()
            .mockImplementation(async () => dashboardResponse());
        vi.stubGlobal('fetch', fetchMock);

        await Promise.all([getAdminDashboardMetrics(), getSecurityStatus()]);
        expect(fetchMock).toHaveBeenCalledOnce();

        await getAdminDashboardMetrics();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('clears a failed request so retry can recover', async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new Error('Temporary network failure'))
            .mockImplementationOnce(async () => dashboardResponse());
        vi.stubGlobal('fetch', fetchMock);

        await expect(getAdminDashboardMetrics()).rejects.toThrow(
            'Temporary network failure',
        );
        await expect(getAdminDashboardMetrics()).resolves.toHaveLength(8);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
