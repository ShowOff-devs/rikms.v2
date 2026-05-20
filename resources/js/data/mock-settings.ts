import type { AgencySettings } from '@/types/settings';

export const mockAgencySettings: AgencySettings = {
    account: {
        fullName: 'Agency Admin',
        emailAddress: 'admin@dostxi.gov.ph',
        role: 'Agency Admin',
        agency: 'DOST XI',
    },
    notifications: {
        notifyNewAccessRequests: true,
        notifyRequestApprovalsDenials: true,
        notifyNewResearchUploads: true,
        browserNotifications: false,
        weeklyDigest: true,
        monthlyAnalyticsReport: true,
    },
    security: {
        twoFactorEnabled: true,
        sessionTimeout: 30,
        activeSessions: [
            {
                id: 'session-current',
                device: 'Desktop workstation',
                browser: 'Chrome 124',
                operatingSystem: 'Windows 11',
                location: 'Davao City, Philippines',
                isCurrent: true,
                status: 'active',
            },
        ],
    },
};
