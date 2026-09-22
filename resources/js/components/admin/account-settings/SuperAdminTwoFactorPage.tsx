import { Form } from '@inertiajs/react';
import {
    KeyRound,
    LockKeyhole,
    ShieldBan,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import { useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';
import { SuperAdminAccountSettingsLayout } from './SuperAdminAccountSettingsLayout';

type Props = {
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
};

export function SuperAdminTwoFactorPage({
    requiresConfirmation,
    twoFactorEnabled,
}: Props) {
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState(false);

    return (
        <SuperAdminAccountSettingsLayout
            activePage="two-factor"
            eyebrow="Account security"
            title="Two-factor Authentication"
            description="Require a verification code in addition to your password when signing in."
        >
            <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col gap-4 border-b border-[#f3f4f6] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#4338ca]">
                            <ShieldCheck className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-[#101828]">
                                Authenticator app
                            </h2>
                            <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                                Use any TOTP-compatible authenticator to
                                generate secure sign-in codes.
                            </p>
                        </div>
                    </div>
                    <span
                        className={
                            twoFactorEnabled
                                ? 'inline-flex w-fit items-center gap-2 rounded-full bg-[#f0fdf4] px-3 py-1.5 text-xs font-semibold text-[#166534]'
                                : 'inline-flex w-fit items-center gap-2 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-xs font-semibold text-[#4a5565]'
                        }
                    >
                        <span
                            className={
                                twoFactorEnabled
                                    ? 'size-1.5 rounded-full bg-[#22c55e]'
                                    : 'size-1.5 rounded-full bg-[#99a1af]'
                            }
                        />
                        {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                    </span>
                </div>

                <div className="p-5 sm:p-6">
                    <div
                        className={
                            twoFactorEnabled
                                ? 'rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] p-5'
                                : 'rounded-[14px] border border-[#dbeafe] bg-[#eff6ff] p-5'
                        }
                    >
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <span
                                className={
                                    twoFactorEnabled
                                        ? 'flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#008236] shadow-sm'
                                        : 'flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#1d4ed8] shadow-sm'
                                }
                            >
                                {twoFactorEnabled ? (
                                    <LockKeyhole className="size-6" />
                                ) : (
                                    <Smartphone className="size-6" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3
                                    className={
                                        twoFactorEnabled
                                            ? 'text-sm font-bold text-[#166534]'
                                            : 'text-sm font-bold text-[#1e3a8a]'
                                    }
                                >
                                    {twoFactorEnabled
                                        ? 'Your account is protected'
                                        : 'Protect your administrator account'}
                                </h3>
                                <p
                                    className={
                                        twoFactorEnabled
                                            ? 'mt-1 text-xs leading-5 text-[#15803d]'
                                            : 'mt-1 text-xs leading-5 text-[#1e40af]/75'
                                    }
                                >
                                    {twoFactorEnabled
                                        ? 'A time-based verification code is required each time you sign in.'
                                        : 'Two-factor authentication prevents access even if your password is compromised.'}
                                </p>
                            </div>
                            {twoFactorEnabled ? (
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#fecaca] bg-white px-4 text-sm font-semibold text-[#c10007] transition hover:bg-[#fef2f2] disabled:opacity-60"
                                        >
                                            <ShieldBan className="size-4" />
                                            {processing
                                                ? 'Disabling...'
                                                : 'Disable 2FA'}
                                        </button>
                                    )}
                                </Form>
                            ) : hasSetupData ? (
                                <button
                                    type="button"
                                    onClick={() => setShowSetupModal(true)}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172f70]"
                                >
                                    <ShieldCheck className="size-4" /> Continue
                                    setup
                                </button>
                            ) : (
                                <Form
                                    {...enable.form()}
                                    onSuccess={() => setShowSetupModal(true)}
                                >
                                    {({ processing }) => (
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172f70] disabled:opacity-60"
                                        >
                                            <ShieldCheck className="size-4" />
                                            {processing
                                                ? 'Enabling...'
                                                : 'Enable 2FA'}
                                        </button>
                                    )}
                                </Form>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {[
                            [
                                '1',
                                'Install an app',
                                'Use Google Authenticator, Authy, or another TOTP app.',
                            ],
                            [
                                '2',
                                'Scan the code',
                                'Scan the QR code shown during the guided setup.',
                            ],
                            [
                                '3',
                                'Save recovery codes',
                                'Store the backup codes in a secure location.',
                            ],
                        ].map(([step, title, text]) => (
                            <div
                                key={step}
                                className="rounded-[12px] border border-[#e5e7eb] p-4"
                            >
                                <span className="flex size-7 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-bold text-[#1e3a8a]">
                                    {step}
                                </span>
                                <p className="mt-3 text-sm font-semibold text-[#364153]">
                                    {title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                                    {text}
                                </p>
                            </div>
                        ))}
                    </div>

                    {twoFactorEnabled ? (
                        <div className="mt-6 border-t border-[#f3f4f6] pt-6">
                            <div className="mb-4 flex items-center gap-2">
                                <KeyRound className="size-4 text-[#1e3a8a]" />
                                <h3 className="text-sm font-bold text-[#101828]">
                                    Recovery codes
                                </h3>
                            </div>
                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />
                        </div>
                    ) : null}
                </div>
            </section>

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </SuperAdminAccountSettingsLayout>
    );
}
