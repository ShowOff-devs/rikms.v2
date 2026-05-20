import { mockPlatformSettings } from '@/data/mock-platform-settings';
import type { PlatformSettings } from '@/types/platform-settings';

const mockNetworkDelay = (duration = 180) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

let platformSettings = cloneSettings(mockPlatformSettings);

function cloneSettings(settings: PlatformSettings): PlatformSettings {
    return {
        general: { ...settings.general },
        repository: {
            ...settings.repository,
            allowedFileTypes: [...settings.repository.allowedFileTypes],
        },
        accessControl: { ...settings.accessControl },
        security: { ...settings.security },
        notifications: { ...settings.notifications },
        maintenance: { ...settings.maintenance },
        backup: { ...settings.backup },
    };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    await mockNetworkDelay();

    return cloneSettings(platformSettings);
}

export async function updatePlatformSettings(
    payload: PlatformSettings,
): Promise<PlatformSettings> {
    await mockNetworkDelay(320);

    platformSettings = cloneSettings(payload);

    return cloneSettings(platformSettings);
}

export async function uploadPlatformLogo(file: File): Promise<string> {
    await mockNetworkDelay(240);

    if (!file.type.startsWith('image/')) {
        throw new Error('Platform logo must be an image file.');
    }

    return URL.createObjectURL(file);
}

export async function enableMaintenanceMode(
    message: string,
): Promise<PlatformSettings> {
    await mockNetworkDelay(220);

    platformSettings = {
        ...platformSettings,
        maintenance: {
            maintenanceModeEnabled: true,
            maintenanceMessage: message,
        },
    };

    return cloneSettings(platformSettings);
}

export async function disableMaintenanceMode(): Promise<PlatformSettings> {
    await mockNetworkDelay(180);

    platformSettings = {
        ...platformSettings,
        maintenance: {
            ...platformSettings.maintenance,
            maintenanceModeEnabled: false,
        },
    };

    return cloneSettings(platformSettings);
}

export async function runSystemBackup(): Promise<PlatformSettings> {
    await mockNetworkDelay(900);

    platformSettings = {
        ...platformSettings,
        backup: {
            ...platformSettings.backup,
            lastBackupAt: new Date().toISOString(),
            backupStatus: 'completed',
        },
    };

    return cloneSettings(platformSettings);
}
