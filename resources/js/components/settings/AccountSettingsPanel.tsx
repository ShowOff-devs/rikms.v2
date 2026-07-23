import { AccountInformationCard } from '@/components/settings/AccountInformationCard';
import { ChangePasswordCard } from '@/components/settings/ChangePasswordCard';
import type { AccountSettings, PasswordChangePayload } from '@/types/settings';

type AccountSettingsPanelProps = {
    account: AccountSettings;
    password: PasswordChangePayload;
    profilePhotoPreviewUrl?: string;
    errors: Record<string, string>;
    onAccountChange: (field: keyof AccountSettings, value: string) => void;
    onPasswordChange: (
        field: keyof PasswordChangePayload,
        value: string,
    ) => void;
    onPhotoSelected: (file: File) => void;
    currentPassword: string;
    emailChanged: boolean;
    isSavingProfile: boolean;
    isSavingPhoto: boolean;
    isSavingPassword: boolean;
    onCurrentPasswordChange: (value: string) => void;
    onSaveProfile: () => void;
    onUploadPhoto: () => void;
    onRemovePhoto: () => void;
    onSavePassword: () => void;
};

export function AccountSettingsPanel({
    account,
    password,
    profilePhotoPreviewUrl,
    errors,
    onAccountChange,
    onPasswordChange,
    onPhotoSelected,
    currentPassword,
    emailChanged,
    isSavingProfile,
    isSavingPhoto,
    isSavingPassword,
    onCurrentPasswordChange,
    onSaveProfile,
    onUploadPhoto,
    onRemovePhoto,
    onSavePassword,
}: AccountSettingsPanelProps) {
    return (
        <div className="space-y-6">
            <AccountInformationCard
                account={account}
                profilePhotoPreviewUrl={profilePhotoPreviewUrl}
                errors={errors}
                onAccountChange={onAccountChange}
                onPhotoSelected={onPhotoSelected}
                currentPassword={currentPassword}
                emailChanged={emailChanged}
                isSavingProfile={isSavingProfile}
                isSavingPhoto={isSavingPhoto}
                onCurrentPasswordChange={onCurrentPasswordChange}
                onSaveProfile={onSaveProfile}
                onUploadPhoto={onUploadPhoto}
                onRemovePhoto={onRemovePhoto}
            />
            <ChangePasswordCard
                password={password}
                errors={errors}
                onPasswordChange={onPasswordChange}
                isSaving={isSavingPassword}
                onSubmit={onSavePassword}
            />
        </div>
    );
}
