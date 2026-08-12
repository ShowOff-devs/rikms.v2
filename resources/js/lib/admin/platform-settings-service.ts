import { fetchApi } from '@/lib/api-client';
import type {
    BackupReadiness,
    PlatformSettings,
} from '@/types/platform-settings';

type ApiSetting = {
    key: string;
    value: string | null;
    type: 'string' | 'integer' | 'boolean' | 'json' | 'encrypted';
    is_encrypted?: boolean;
    effective_value?: string | number | boolean | null;
};

type LogoUploadResponse = {
    logo_url: string;
};

const defaultPlatformSettings: PlatformSettings = {
    general: {
        systemName: 'RIKMS v2',
        shortName: 'RIKMS',
        platformLogoUrl: undefined,
        defaultLanguage: 'English',
        timezone: 'Asia/Manila (UTC+8)',
    },
    repository: {
        maxUploadSizeMb: 25,
        effectiveMaxUploadSizeMb: 25,
        allowedFileTypes: ['PDF', 'DOCX', 'XLSX'],
        defaultResearchStatus: 'draft',
        requireAuthors: true,
        requireAbstract: true,
        requireKeywords: false,
        requirePublicationYear: true,
    },
    accessControl: {
        accessRequestEnabled: true,
        defaultAccessPolicy: 'request-access',
        embargoOverrideEnabled: false,
        embargoDurationMonths: 6,
    },
    security: {
        requireMfaForSuperAdmins: false,
        loginAlertsEnabled: true,
        failedLoginThreshold: 5,
        lockoutDurationMinutes: 15,
        sessionTimeoutMinutes: 60,
    },
    notifications: {
        systemNotificationsEnabled: true,
        emailNotificationsEnabled: false,
        securityAlertsEnabled: true,
        notifyAccessRequestSubmitted: true,
        notifyResearchPublished: true,
        notifyWeeklyActivityDigest: false,
    },
    maintenance: {
        maintenanceModeEnabled: false,
        maintenanceMessage:
            'RIKMS is temporarily unavailable while maintenance is in progress.',
    },
    ai: {
        processingEnabled: false,
    },
    // Backup execution is not configured in the pilot; these settings are informational only.
    backup: {
        lastBackupAt: 'Not configured',
        backupFrequency: 'Daily at 03:00 AM',
        backupStatus: 'idle',
        destinationLabel: 'External drive',
        retentionDays: 30,
    },
};

function parseValue(setting: ApiSetting | undefined, fallback: unknown) {
    if (!setting || setting.is_encrypted) {
        return fallback;
    }

    if (setting.type === 'boolean') {
        return setting.value === 'true' || setting.value === '1';
    }

    if (setting.type === 'integer') {
        return Number(setting.value ?? fallback);
    }

    if (setting.type === 'json') {
        try {
            return setting.value ? JSON.parse(setting.value) : fallback;
        } catch {
            return fallback;
        }
    }

    return setting.value ?? fallback;
}

function byKey(settings: ApiSetting[]) {
    return new Map(settings.map((setting) => [setting.key, setting]));
}

function toPlatformSettings(settings: ApiSetting[]): PlatformSettings {
    const map = byKey(settings);
    const fallback = defaultPlatformSettings;

    return {
        general: {
            systemName: String(
                parseValue(map.get('site.name'), fallback.general.systemName),
            ),
            shortName: String(
                parseValue(
                    map.get('site.short_name'),
                    fallback.general.shortName,
                ),
            ),
            platformLogoUrl: parseValue(
                map.get('site.logo_url'),
                fallback.general.platformLogoUrl,
            ) as string | undefined,
            defaultLanguage: String(
                parseValue(
                    map.get('site.default_language'),
                    fallback.general.defaultLanguage,
                ),
            ),
            timezone: String(
                parseValue(map.get('site.timezone'), fallback.general.timezone),
            ),
        },
        repository: {
            maxUploadSizeMb: Number(
                parseValue(
                    map.get('uploads.max_file_size_mb'),
                    fallback.repository.maxUploadSizeMb,
                ),
            ),
            effectiveMaxUploadSizeMb: Number(
                map.get('uploads.max_file_size_mb')?.effective_value ??
                    fallback.repository.effectiveMaxUploadSizeMb,
            ),
            allowedFileTypes: parseValue(
                map.get('uploads.allowed_file_types'),
                fallback.repository.allowedFileTypes,
            ) as string[],
            defaultResearchStatus: parseValue(
                map.get('research.default_status'),
                fallback.repository.defaultResearchStatus,
            ) as PlatformSettings['repository']['defaultResearchStatus'],
            requireAuthors: Boolean(
                parseValue(
                    map.get('research.require_authors'),
                    fallback.repository.requireAuthors,
                ),
            ),
            requireAbstract: Boolean(
                parseValue(
                    map.get('research.require_abstract'),
                    fallback.repository.requireAbstract,
                ),
            ),
            requireKeywords: Boolean(
                parseValue(
                    map.get('research.require_keywords'),
                    fallback.repository.requireKeywords,
                ),
            ),
            requirePublicationYear: Boolean(
                parseValue(
                    map.get('research.require_publication_year'),
                    fallback.repository.requirePublicationYear,
                ),
            ),
        },
        accessControl: {
            accessRequestEnabled: Boolean(
                parseValue(
                    map.get('access_requests.enabled'),
                    fallback.accessControl.accessRequestEnabled,
                ),
            ),
            defaultAccessPolicy: parseValue(
                map.get('access_requests.default_policy'),
                fallback.accessControl.defaultAccessPolicy,
            ) as PlatformSettings['accessControl']['defaultAccessPolicy'],
            embargoOverrideEnabled: Boolean(
                parseValue(
                    map.get('access_requests.embargo_override_enabled'),
                    fallback.accessControl.embargoOverrideEnabled,
                ),
            ),
            embargoDurationMonths: Number(
                parseValue(
                    map.get('access_requests.embargo_duration_months'),
                    fallback.accessControl.embargoDurationMonths,
                ),
            ),
        },
        security: {
            requireMfaForSuperAdmins: Boolean(
                parseValue(
                    map.get('security.require_mfa_super_admins'),
                    fallback.security.requireMfaForSuperAdmins,
                ),
            ),
            loginAlertsEnabled: Boolean(
                parseValue(
                    map.get('security.login_alerts_enabled'),
                    fallback.security.loginAlertsEnabled,
                ),
            ),
            failedLoginThreshold: Number(
                parseValue(
                    map.get('security.failed_login_threshold'),
                    fallback.security.failedLoginThreshold,
                ),
            ),
            lockoutDurationMinutes: Number(
                parseValue(
                    map.get('security.lockout_duration_minutes'),
                    fallback.security.lockoutDurationMinutes,
                ),
            ),
            sessionTimeoutMinutes: Number(
                parseValue(
                    map.get('security.session_timeout_minutes'),
                    fallback.security.sessionTimeoutMinutes,
                ),
            ),
        },
        notifications: {
            systemNotificationsEnabled: Boolean(
                parseValue(
                    map.get('notifications.system_enabled'),
                    fallback.notifications.systemNotificationsEnabled,
                ),
            ),
            emailNotificationsEnabled: Boolean(
                parseValue(
                    map.get('notifications.email_enabled'),
                    fallback.notifications.emailNotificationsEnabled,
                ),
            ),
            securityAlertsEnabled: Boolean(
                parseValue(
                    map.get('notifications.security_alerts_enabled'),
                    fallback.notifications.securityAlertsEnabled,
                ),
            ),
            notifyAccessRequestSubmitted: Boolean(
                parseValue(
                    map.get('notifications.access_request_submitted'),
                    fallback.notifications.notifyAccessRequestSubmitted,
                ),
            ),
            notifyResearchPublished: Boolean(
                parseValue(
                    map.get('notifications.research_published'),
                    fallback.notifications.notifyResearchPublished,
                ),
            ),
            notifyWeeklyActivityDigest: Boolean(
                parseValue(
                    map.get('notifications.weekly_activity_digest'),
                    fallback.notifications.notifyWeeklyActivityDigest,
                ),
            ),
        },
        maintenance: {
            maintenanceModeEnabled: Boolean(
                parseValue(
                    map.get('maintenance.enabled'),
                    fallback.maintenance.maintenanceModeEnabled,
                ),
            ),
            maintenanceMessage: String(
                parseValue(
                    map.get('maintenance.notice_text'),
                    fallback.maintenance.maintenanceMessage,
                ),
            ),
        },
        ai: {
            processingEnabled: Boolean(
                parseValue(
                    map.get('ai.processing.enabled'),
                    fallback.ai.processingEnabled,
                ),
            ),
        },
        backup: {
            lastBackupAt: String(
                parseValue(
                    map.get('backup.last_backup_at'),
                    fallback.backup.lastBackupAt,
                ),
            ),
            backupFrequency: String(
                parseValue(
                    map.get('backup.frequency'),
                    fallback.backup.backupFrequency,
                ),
            ),
            backupStatus: parseValue(
                map.get('backup.status'),
                fallback.backup.backupStatus,
            ) as PlatformSettings['backup']['backupStatus'],
            destinationLabel: String(
                parseValue(
                    map.get('backup.destination_label'),
                    fallback.backup.destinationLabel,
                ),
            ),
            retentionDays: Number(
                parseValue(
                    map.get('backup.retention_days'),
                    fallback.backup.retentionDays,
                ),
            ),
        },
    };
}

function toApiSettings(settings: PlatformSettings) {
    return {
        'site.name': settings.general.systemName,
        'site.short_name': settings.general.shortName,
        'site.default_language': settings.general.defaultLanguage,
        'site.timezone': settings.general.timezone,
        'site.logo_url': settings.general.platformLogoUrl ?? null,
        'uploads.max_file_size_mb': settings.repository.maxUploadSizeMb,
        'uploads.allowed_file_types': settings.repository.allowedFileTypes,
        'research.default_status': settings.repository.defaultResearchStatus,
        'research.require_authors': settings.repository.requireAuthors,
        'research.require_abstract': settings.repository.requireAbstract,
        'research.require_keywords': settings.repository.requireKeywords,
        'research.require_publication_year':
            settings.repository.requirePublicationYear,
        'access_requests.enabled': settings.accessControl.accessRequestEnabled,
        'access_requests.default_policy':
            settings.accessControl.defaultAccessPolicy,
        'access_requests.embargo_override_enabled':
            settings.accessControl.embargoOverrideEnabled,
        'access_requests.embargo_duration_months':
            settings.accessControl.embargoDurationMonths,
        'security.require_mfa_super_admins':
            settings.security.requireMfaForSuperAdmins,
        'security.login_alerts_enabled': settings.security.loginAlertsEnabled,
        'security.failed_login_threshold':
            settings.security.failedLoginThreshold,
        'security.lockout_duration_minutes':
            settings.security.lockoutDurationMinutes,
        'security.session_timeout_minutes':
            settings.security.sessionTimeoutMinutes,
        'notifications.system_enabled':
            settings.notifications.systemNotificationsEnabled,
        'notifications.email_enabled':
            settings.notifications.emailNotificationsEnabled,
        'notifications.security_alerts_enabled':
            settings.notifications.securityAlertsEnabled,
        'notifications.access_request_submitted':
            settings.notifications.notifyAccessRequestSubmitted,
        'notifications.research_published':
            settings.notifications.notifyResearchPublished,
        'notifications.weekly_activity_digest':
            settings.notifications.notifyWeeklyActivityDigest,
        'maintenance.enabled': settings.maintenance.maintenanceModeEnabled,
        'maintenance.notice_text': settings.maintenance.maintenanceMessage,
        'ai.processing.enabled': settings.ai.processingEnabled,
        'backup.frequency': settings.backup.backupFrequency,
        'backup.destination_label': settings.backup.destinationLabel,
        'backup.retention_days': settings.backup.retentionDays,
    };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const response = await fetchApi<ApiSetting[]>(
        '/api/admin/platform-settings?per_page=100',
    );

    return toPlatformSettings(response.data);
}

export async function getBackupReadiness(): Promise<BackupReadiness> {
    const response = await fetchApi<BackupReadiness>(
        '/api/admin/platform-settings/backup-readiness',
    );

    return response.data;
}

export async function updatePlatformSettings(
    payload: PlatformSettings,
): Promise<PlatformSettings> {
    const response = await fetchApi<ApiSetting[]>(
        '/api/admin/platform-settings/bulk-update',
        {
            method: 'POST',
            body: JSON.stringify({ settings: toApiSettings(payload) }),
        },
    );

    return toPlatformSettings(response.data);
}

export async function uploadPlatformLogo(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Platform logo must be an image file.');
    }

    if (file.size > 2 * 1024 * 1024) {
        throw new Error('Platform logo must be 2MB or smaller.');
    }

    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetchApi<LogoUploadResponse>(
        '/api/admin/platform-settings/logo',
        {
            method: 'POST',
            body: formData,
        },
    );

    return response.data.logo_url;
}

export async function enableMaintenanceMode(
    message: string,
): Promise<PlatformSettings> {
    const settings = await getPlatformSettings();

    return updatePlatformSettings({
        ...settings,
        maintenance: {
            maintenanceModeEnabled: true,
            maintenanceMessage: message,
        },
    });
}

export async function disableMaintenanceMode(): Promise<PlatformSettings> {
    const settings = await getPlatformSettings();

    return updatePlatformSettings({
        ...settings,
        maintenance: {
            ...settings.maintenance,
            maintenanceModeEnabled: false,
        },
    });
}
