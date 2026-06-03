import { fetchApi } from '@/lib/api-client';
import type {
    AccountSettings,
    AgencySettings,
    DeactivationRequestResult,
    NotificationSettings,
    PasswordChangePayload,
    ProfilePhotoUploadResult,
    SecuritySettings,
} from '@/types/settings';

export async function getAgencySettings() {
    const { data } = await fetchApi<AgencySettings>('/api/agency/settings');

    return structuredClone(data);
}

export async function updateAccountSettings(payload: AccountSettings) {
    const { data } = await fetchApi<AccountSettings>(
        '/api/agency/settings/account',
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );

    return data;
}

export async function updateNotificationSettings(
    payload: NotificationSettings,
) {
    const { data } = await fetchApi<NotificationSettings>(
        '/api/agency/settings/notifications',
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );

    return data;
}

export async function updateSecuritySettings(payload: SecuritySettings) {
    const securityPayload = {
        twoFactorEnabled: payload.twoFactorEnabled,
        sessionTimeout: payload.sessionTimeout,
    };
    const { data } = await fetchApi<SecuritySettings>(
        '/api/agency/settings/security',
        {
            method: 'PATCH',
            body: JSON.stringify(securityPayload),
        },
    );

    return data;
}

export async function uploadProfilePhoto(
    file: File,
): Promise<ProfilePhotoUploadResult> {
    const formData = new FormData();

    formData.append('photo', file);

    const { data } = await fetchApi<ProfilePhotoUploadResult>(
        '/api/agency/settings/profile-photo',
        {
            method: 'POST',
            body: formData,
        },
    );

    return data;
}

export async function changePassword(payload: PasswordChangePayload) {
    const { data } = await fetchApi<{ success: boolean; changedAt: string }>(
        '/api/agency/settings/password',
        {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: payload.currentPassword,
                newPassword: payload.newPassword,
                newPassword_confirmation: payload.confirmNewPassword,
            }),
        },
    );

    return data;
}

export async function requestAccountDeactivation(): Promise<DeactivationRequestResult> {
    const { data } = await fetchApi<DeactivationRequestResult>(
        '/api/agency/settings/deactivation-request',
        {
            method: 'POST',
        },
    );

    return data;
}
