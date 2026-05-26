import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import type { PasswordChangePayload } from '@/types/settings';

type ChangePasswordCardProps = {
    password: PasswordChangePayload;
    errors: Record<string, string>;
    onPasswordChange: (
        field: keyof PasswordChangePayload,
        value: string,
    ) => void;
};

const inputClass =
    'h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 pr-11 text-sm text-[#101828] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 aria-invalid:border-[#ff6467] aria-invalid:ring-[#ff6467]/10';

export function ChangePasswordCard({
    password,
    errors,
    onPasswordChange,
}: ChangePasswordCardProps) {
    const [visibleFields, setVisibleFields] = useState<
        Partial<Record<keyof PasswordChangePayload, boolean>>
    >({});

    const toggleVisible = (field: keyof PasswordChangePayload) => {
        setVisibleFields((current) => ({
            ...current,
            [field]: !current[field],
        }));
    };

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="border-b border-[#f3f4f6] pb-2">
                <h2 className="flex items-center gap-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                    <LockKeyhole className="size-4" />
                    Change Password
                </h2>
            </div>

            <div className="mt-5 grid gap-5">
                <PasswordField
                    label="Current Password"
                    value={password.currentPassword}
                    visible={Boolean(visibleFields.currentPassword)}
                    error={errors.currentPassword}
                    onToggleVisible={() => toggleVisible('currentPassword')}
                    onChange={(value) =>
                        onPasswordChange('currentPassword', value)
                    }
                />
                <div className="grid gap-5 md:grid-cols-2">
                    <PasswordField
                        label="New Password"
                        value={password.newPassword}
                        visible={Boolean(visibleFields.newPassword)}
                        error={errors.newPassword}
                        onToggleVisible={() => toggleVisible('newPassword')}
                        onChange={(value) =>
                            onPasswordChange('newPassword', value)
                        }
                    />
                    <PasswordField
                        label="Confirm New Password"
                        value={password.confirmNewPassword}
                        visible={Boolean(visibleFields.confirmNewPassword)}
                        error={errors.confirmNewPassword}
                        onToggleVisible={() =>
                            toggleVisible('confirmNewPassword')
                        }
                        onChange={(value) =>
                            onPasswordChange('confirmNewPassword', value)
                        }
                    />
                </div>
            </div>
        </section>
    );
}

function PasswordField({
    label,
    value,
    visible,
    error,
    onChange,
    onToggleVisible,
}: {
    label: string;
    value: string;
    visible: boolean;
    error?: string;
    onChange: (value: string) => void;
    onToggleVisible: () => void;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm leading-5 font-medium text-[#364153]">
                {label}
            </span>
            <span className="relative block">
                <input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    type={visible ? 'text' : 'password'}
                    aria-invalid={Boolean(error)}
                    autoComplete="new-password"
                    className={inputClass}
                />
                <button
                    type="button"
                    onClick={onToggleVisible}
                    className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#6a7282] hover:bg-[#e5e7eb]"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </button>
            </span>
            {error ? (
                <span className="mt-1 block text-xs leading-4 font-medium text-[#e7000b]">
                    {error}
                </span>
            ) : null}
        </label>
    );
}
