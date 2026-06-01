import { mockAgencySettings } from '@/data/mock-settings';
// TODO Phase 8/9: Replace this mock fallback after the real protected API and browser QA are complete.
import type {
    AccountSettings,
    AgencySettings,
    DeactivationRequestResult,
    NotificationSettings,
    PasswordChangePayload,
    ProfilePhotoUploadResult,
    SecuritySettings,
} from '@/types/settings';

let currentAgencySettings: AgencySettings = structuredClone(mockAgencySettings);

const mockNetworkDelay = (duration = 240) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
            reject(new Error('Unable to read profile photo.'));
        reader.readAsDataURL(file);
    });

export async function getAgencySettings() {
    await mockNetworkDelay();

    return structuredClone(currentAgencySettings);
}

export async function updateAccountSettings(payload: AccountSettings) {
    await mockNetworkDelay(320);

    currentAgencySettings = {
        ...currentAgencySettings,
        account: {
            ...payload,
        },
    };

    return structuredClone(currentAgencySettings.account);
}

export async function updateNotificationSettings(
    payload: NotificationSettings,
) {
    await mockNetworkDelay(280);

    currentAgencySettings = {
        ...currentAgencySettings,
        notifications: {
            ...payload,
        },
    };

    return structuredClone(currentAgencySettings.notifications);
}

export async function updateSecuritySettings(payload: SecuritySettings) {
    await mockNetworkDelay(280);

    currentAgencySettings = {
        ...currentAgencySettings,
        security: {
            ...payload,
            activeSessions: [...payload.activeSessions],
        },
    };

    return structuredClone(currentAgencySettings.security);
}

export async function uploadProfilePhoto(
    file: File,
): Promise<ProfilePhotoUploadResult> {
    await mockNetworkDelay(300);

    return {
        profilePhotoUrl: await fileToDataUrl(file),
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
    };
}

export async function changePassword(payload: PasswordChangePayload) {
    await mockNetworkDelay(360);

    return {
        success: Boolean(payload.currentPassword && payload.newPassword),
        changedAt: new Date().toISOString(),
    };
}

export async function requestAccountDeactivation(): Promise<DeactivationRequestResult> {
    await mockNetworkDelay(360);

    return {
        status: 'submitted',
        requestedAt: new Date().toISOString(),
    };
}
