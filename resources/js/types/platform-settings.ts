export type ResearchStatus = 'draft' | 'published' | 'pending-review';

export type AccessPolicy = 'public' | 'request-access' | 'restricted';

export type BackupStatus = 'idle' | 'running' | 'completed' | 'failed';

export type PlatformSettings = {
    general: {
        systemName: string;
        shortName: string;
        platformLogoUrl?: string;
        defaultLanguage: string;
        timezone: string;
    };
    repository: {
        maxUploadSizeMb: number;
        allowedFileTypes: string[];
        defaultResearchStatus: ResearchStatus;
        requireAuthors: boolean;
        requireAbstract: boolean;
        requireKeywords: boolean;
        requirePublicationYear: boolean;
    };
    accessControl: {
        accessRequestEnabled: boolean;
        defaultAccessPolicy: AccessPolicy;
        embargoOverrideEnabled: boolean;
        embargoDurationMonths?: number;
    };
    security: {
        requireMfaForSuperAdmins: boolean;
        loginAlertsEnabled: boolean;
        failedLoginThreshold: number;
        lockoutDurationMinutes: number;
        sessionTimeoutMinutes: number;
    };
    notifications: {
        systemNotificationsEnabled: boolean;
        emailNotificationsEnabled: boolean;
        securityAlertsEnabled: boolean;
        notifyAccessRequestSubmitted: boolean;
        notifyResearchPublished: boolean;
        notifyWeeklyActivityDigest: boolean;
    };
    maintenance: {
        maintenanceModeEnabled: boolean;
        maintenanceMessage: string;
    };
    backup: {
        lastBackupAt: string;
        backupFrequency: string;
        backupStatus: BackupStatus;
    };
};

export type PlatformSettingsErrors = Record<string, string>;
