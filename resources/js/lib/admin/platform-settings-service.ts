import { mockPlatformSettings } from '@/data/mock-platform-settings';
import { fetchApi } from '@/lib/api-client';
import type { PlatformSettings } from '@/types/platform-settings';

type ApiSetting = {
    key: string;
    value: string | null;
    type: 'string' | 'integer' | 'boolean' | 'json' | 'encrypted';
    is_encrypted?: boolean;
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
    const fallback = mockPlatformSettings;

    return {
        general: {
            systemName: String(parseValue(map.get('site.name'), fallback.general.systemName)),
            shortName: String(parseValue(map.get('site.short_name'), fallback.general.shortName)),
            platformLogoUrl: parseValue(map.get('site.logo_url'), fallback.general.platformLogoUrl) as string | undefined,
            defaultLanguage: String(parseValue(map.get('site.default_language'), fallback.general.defaultLanguage)),
            timezone: String(parseValue(map.get('site.timezone'), fallback.general.timezone)),
        },
        repository: {
            maxUploadSizeMb: Number(parseValue(map.get('uploads.max_file_size_mb'), fallback.repository.maxUploadSizeMb)),
            allowedFileTypes: parseValue(map.get('uploads.allowed_file_types'), fallback.repository.allowedFileTypes) as string[],
            defaultResearchStatus: parseValue(map.get('research.default_status'), fallback.repository.defaultResearchStatus) as PlatformSettings['repository']['defaultResearchStatus'],
            requireAuthors: Boolean(parseValue(map.get('research.require_authors'), fallback.repository.requireAuthors)),
            requireAbstract: Boolean(parseValue(map.get('research.require_abstract'), fallback.repository.requireAbstract)),
            requireKeywords: Boolean(parseValue(map.get('research.require_keywords'), fallback.repository.requireKeywords)),
            requirePublicationYear: Boolean(parseValue(map.get('research.require_publication_year'), fallback.repository.requirePublicationYear)),
        },
        accessControl: {
            accessRequestEnabled: Boolean(parseValue(map.get('access_requests.enabled'), fallback.accessControl.accessRequestEnabled)),
            defaultAccessPolicy: parseValue(map.get('access_requests.default_policy'), fallback.accessControl.defaultAccessPolicy) as PlatformSettings['accessControl']['defaultAccessPolicy'],
            embargoOverrideEnabled: Boolean(parseValue(map.get('access_requests.embargo_override_enabled'), fallback.accessControl.embargoOverrideEnabled)),
            embargoDurationMonths: Number(parseValue(map.get('access_requests.embargo_duration_months'), fallback.accessControl.embargoDurationMonths)),
        },
        security: {
            requireMfaForSuperAdmins: Boolean(parseValue(map.get('security.require_mfa_super_admins'), fallback.security.requireMfaForSuperAdmins)),
            loginAlertsEnabled: Boolean(parseValue(map.get('security.login_alerts_enabled'), fallback.security.loginAlertsEnabled)),
            failedLoginThreshold: Number(parseValue(map.get('security.failed_login_threshold'), fallback.security.failedLoginThreshold)),
            lockoutDurationMinutes: Number(parseValue(map.get('security.lockout_duration_minutes'), fallback.security.lockoutDurationMinutes)),
            sessionTimeoutMinutes: Number(parseValue(map.get('security.session_timeout_minutes'), fallback.security.sessionTimeoutMinutes)),
        },
        notifications: {
            systemNotificationsEnabled: Boolean(parseValue(map.get('notifications.system_enabled'), fallback.notifications.systemNotificationsEnabled)),
            emailNotificationsEnabled: Boolean(parseValue(map.get('notifications.email_enabled'), fallback.notifications.emailNotificationsEnabled)),
            securityAlertsEnabled: Boolean(parseValue(map.get('notifications.security_alerts_enabled'), fallback.notifications.securityAlertsEnabled)),
            notifyAccessRequestSubmitted: Boolean(parseValue(map.get('notifications.access_request_submitted'), fallback.notifications.notifyAccessRequestSubmitted)),
            notifyResearchPublished: Boolean(parseValue(map.get('notifications.research_published'), fallback.notifications.notifyResearchPublished)),
            notifyWeeklyActivityDigest: Boolean(parseValue(map.get('notifications.weekly_activity_digest'), fallback.notifications.notifyWeeklyActivityDigest)),
        },
        maintenance: {
            maintenanceModeEnabled: Boolean(parseValue(map.get('maintenance.enabled'), fallback.maintenance.maintenanceModeEnabled)),
            maintenanceMessage: String(parseValue(map.get('maintenance.notice_text'), fallback.maintenance.maintenanceMessage)),
        },
        backup: {
            lastBackupAt: String(parseValue(map.get('backup.last_backup_at'), fallback.backup.lastBackupAt)),
            backupFrequency: String(parseValue(map.get('backup.frequency'), fallback.backup.backupFrequency)),
            backupStatus: parseValue(map.get('backup.status'), fallback.backup.backupStatus) as PlatformSettings['backup']['backupStatus'],
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
        'research.require_publication_year': settings.repository.requirePublicationYear,
        'access_requests.enabled': settings.accessControl.accessRequestEnabled,
        'access_requests.default_policy': settings.accessControl.defaultAccessPolicy,
        'access_requests.embargo_override_enabled': settings.accessControl.embargoOverrideEnabled,
        'access_requests.embargo_duration_months': settings.accessControl.embargoDurationMonths,
        'security.require_mfa_super_admins': settings.security.requireMfaForSuperAdmins,
        'security.login_alerts_enabled': settings.security.loginAlertsEnabled,
        'security.failed_login_threshold': settings.security.failedLoginThreshold,
        'security.lockout_duration_minutes': settings.security.lockoutDurationMinutes,
        'security.session_timeout_minutes': settings.security.sessionTimeoutMinutes,
        'notifications.system_enabled': settings.notifications.systemNotificationsEnabled,
        'notifications.email_enabled': settings.notifications.emailNotificationsEnabled,
        'notifications.security_alerts_enabled': settings.notifications.securityAlertsEnabled,
        'notifications.access_request_submitted': settings.notifications.notifyAccessRequestSubmitted,
        'notifications.research_published': settings.notifications.notifyResearchPublished,
        'notifications.weekly_activity_digest': settings.notifications.notifyWeeklyActivityDigest,
        'maintenance.enabled': settings.maintenance.maintenanceModeEnabled,
        'maintenance.notice_text': settings.maintenance.maintenanceMessage,
        'backup.last_backup_at': settings.backup.lastBackupAt,
        'backup.frequency': settings.backup.backupFrequency,
        'backup.status': settings.backup.backupStatus,
    };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const response = await fetchApi<ApiSetting[]>('/api/admin/platform-settings?per_page=100');

    return toPlatformSettings(response.data);
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

    // TODO Phase 9: Replace this local object URL fallback after a real protected media upload API and authenticated browser automation pass.
    return URL.createObjectURL(file);
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

export async function runSystemBackup(): Promise<PlatformSettings> {
    const settings = await getPlatformSettings();

    // TODO Phase 9: Replace this settings-only backup marker after a real backup job endpoint and browser automation pass.
    return updatePlatformSettings({
        ...settings,
        backup: {
            ...settings.backup,
            lastBackupAt: new Date().toISOString(),
            backupStatus: 'completed',
        },
    });
}
