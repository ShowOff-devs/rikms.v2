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
};

export function AccountSettingsPanel({
    account,
    password,
    profilePhotoPreviewUrl,
    errors,
    onAccountChange,
    onPasswordChange,
    onPhotoSelected,
}: AccountSettingsPanelProps) {
    return (
        <div className="space-y-6">
            <AccountInformationCard
                account={account}
                profilePhotoPreviewUrl={profilePhotoPreviewUrl}
                errors={errors}
                onAccountChange={onAccountChange}
                onPhotoSelected={onPhotoSelected}
            />
            <ChangePasswordCard
                password={password}
                errors={errors}
                onPasswordChange={onPasswordChange}
            />
        </div>
    );
}
