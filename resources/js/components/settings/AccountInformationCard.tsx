import { Camera, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import type { AccountSettings } from '@/types/settings';

type AccountInformationCardProps = {
    account: AccountSettings;
    profilePhotoPreviewUrl?: string;
    errors: Record<string, string>;
    onAccountChange: (field: keyof AccountSettings, value: string) => void;
    onPhotoSelected: (file: File) => void;
};

const acceptedPhotoTypes =
    '.png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg';

const inputClass =
    'h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#101828] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 aria-invalid:border-[#ff6467] aria-invalid:ring-[#ff6467]/10 disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#6a7282]';

export function AccountInformationCard({
    account,
    profilePhotoPreviewUrl,
    errors,
    onAccountChange,
    onPhotoSelected,
}: AccountInformationCardProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const visiblePhotoUrl = profilePhotoPreviewUrl ?? account.profilePhotoUrl;
    const initials = useMemo(
        () =>
            account.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || 'AD',
        [account.fullName],
    );

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#f3f4f6] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                Account Information
            </h2>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1e3a8a] text-xl font-bold text-white">
                    {visiblePhotoUrl ? (
                        <img
                            src={visiblePhotoUrl}
                            alt="Profile photo preview"
                            className="size-full object-cover"
                        />
                    ) : (
                        initials
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base leading-6 font-semibold text-[#101828]">
                            {account.fullName}
                        </h3>
                        <span className="rounded-full bg-[rgba(30,58,138,0.1)] px-2.5 py-1 text-xs leading-4 font-semibold text-[#1e3a8a]">
                            {account.role}
                        </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm leading-5 text-[#6a7282]">
                        <Mail className="size-4" />
                        {account.emailAddress}
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedPhotoTypes}
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                                onPhotoSelected(file);
                            }

                            event.target.value = '';
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm leading-5 font-medium text-[#364153] hover:bg-[#f9fafb]"
                    >
                        <Camera className="size-4" />
                        Change photo
                    </button>
                    {errors.profilePhoto ? (
                        <p className="mt-2 text-xs leading-4 font-medium text-[#e7000b]">
                            {errors.profilePhoto}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Full Name" required error={errors.fullName}>
                    <input
                        value={account.fullName}
                        onChange={(event) =>
                            onAccountChange('fullName', event.target.value)
                        }
                        aria-invalid={Boolean(errors.fullName)}
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Email Address"
                    required
                    error={errors.emailAddress}
                >
                    <input
                        value={account.emailAddress}
                        onChange={(event) =>
                            onAccountChange('emailAddress', event.target.value)
                        }
                        type="email"
                        aria-invalid={Boolean(errors.emailAddress)}
                        className={inputClass}
                    />
                </Field>

                <Field label="Role">
                    <input
                        value={account.role}
                        readOnly
                        disabled
                        className={inputClass}
                    />
                </Field>

                <Field label="Agency">
                    <input
                        value={account.agency}
                        readOnly
                        disabled
                        className={inputClass}
                    />
                </Field>
            </div>
        </section>
    );
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm leading-5 font-medium text-[#364153]">
                {label}{' '}
                {required ? <span className="text-[#ff6467]">*</span> : null}
            </span>
            {children}
            {error ? (
                <span className="mt-1 block text-xs leading-4 font-medium text-[#e7000b]">
                    {error}
                </span>
            ) : null}
        </label>
    );
}
