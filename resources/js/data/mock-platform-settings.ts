import type { PlatformSettings } from '@/types/platform-settings';

export const mockPlatformSettings: PlatformSettings = {
    general: {
        systemName: 'Regionwide Integrated Knowledge Management System',
        shortName: 'RIKMS',
        defaultLanguage: 'English',
        timezone: 'Asia/Manila (UTC+8)',
    },
    repository: {
        maxUploadSizeMb: 50,
        allowedFileTypes: ['PDF', 'DOCX', 'XLSX', 'CSV'],
        defaultResearchStatus: 'pending-review',
        requireAuthors: true,
        requireAbstract: true,
        requireKeywords: true,
        requirePublicationYear: true,
    },
    accessControl: {
        accessRequestEnabled: true,
        defaultAccessPolicy: 'request-access',
        embargoOverrideEnabled: true,
        embargoDurationMonths: 12,
    },
    security: {
        requireMfaForSuperAdmins: true,
        loginAlertsEnabled: true,
        failedLoginThreshold: 5,
        lockoutDurationMinutes: 15,
        sessionTimeoutMinutes: 30,
    },
    notifications: {
        systemNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        securityAlertsEnabled: true,
        notifyAccessRequestSubmitted: true,
        notifyResearchPublished: true,
        notifyWeeklyActivityDigest: false,
    },
    maintenance: {
        maintenanceModeEnabled: false,
        maintenanceMessage:
            'RIKMS is temporarily unavailable while scheduled maintenance is in progress.',
    },
    backup: {
        lastBackupAt: '2026-03-10T03:00:00+08:00',
        backupFrequency: 'Daily at 03:00 AM',
        backupStatus: 'completed',
    },
};
