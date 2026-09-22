import { Transition } from '@headlessui/react';
import { Form } from '@inertiajs/react';
import {
    CheckCircle2,
    KeyRound,
    LockKeyhole,
    Save,
    ShieldCheck,
} from 'lucide-react';
import { useRef } from 'react';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { SuperAdminAccountSettingsLayout } from './SuperAdminAccountSettingsLayout';

const inputClassName =
    'mt-1.5 h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#101828] outline-none transition focus:border-[#1e3a8a] focus:bg-white focus:ring-2 focus:ring-[#1e3a8a]/10';

export function SuperAdminPasswordPage() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <SuperAdminAccountSettingsLayout
            activePage="password"
            eyebrow="Account security"
            title="Password"
            description="Choose a strong, unique password for your administrator account."
        >
            <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-3 border-b border-[#f3f4f6] p-5 sm:p-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#4338ca]">
                        <KeyRound className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold text-[#101828]">
                            Change password
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                            Updating your password will not sign you out of this
                            session.
                        </p>
                    </div>
                </div>

                <Form
                    {...PasswordController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="p-5 sm:p-6"
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <div className="max-w-2xl space-y-5">
                                <label className="block text-sm font-medium text-[#364153]">
                                    Current password
                                    <span className="ml-1 text-[#ff6467]">
                                        *
                                    </span>
                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        className={inputClassName}
                                        autoComplete="current-password"
                                        placeholder="Enter your current password"
                                    />
                                    <InputError
                                        className="mt-1.5"
                                        message={errors.current_password}
                                    />
                                </label>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <label className="block text-sm font-medium text-[#364153]">
                                        New password
                                        <span className="ml-1 text-[#ff6467]">
                                            *
                                        </span>
                                        <PasswordInput
                                            id="password"
                                            ref={passwordInput}
                                            name="password"
                                            className={inputClassName}
                                            autoComplete="new-password"
                                            placeholder="Enter a new password"
                                        />
                                        <InputError
                                            className="mt-1.5"
                                            message={errors.password}
                                        />
                                    </label>

                                    <label className="block text-sm font-medium text-[#364153]">
                                        Confirm new password
                                        <span className="ml-1 text-[#ff6467]">
                                            *
                                        </span>
                                        <PasswordInput
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            className={inputClassName}
                                            autoComplete="new-password"
                                            placeholder="Repeat the new password"
                                        />
                                        <InputError
                                            className="mt-1.5"
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </label>
                                </div>

                                <div className="rounded-[10px] border border-[#dbeafe] bg-[#eff6ff] p-4">
                                    <div className="flex items-start gap-3">
                                        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#1d4ed8]" />
                                        <div>
                                            <p className="text-xs font-semibold text-[#1e3a8a]">
                                                Password guidance
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[#1e40af]/75">
                                                Use at least 12 characters with
                                                a mix of uppercase and lowercase
                                                letters, numbers, and symbols.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#f3f4f6] pt-5">
                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p
                                        className="flex items-center gap-1.5 text-sm font-medium text-[#008236]"
                                        role="status"
                                    >
                                        <CheckCircle2 className="size-4" />{' '}
                                        Password updated
                                    </p>
                                </Transition>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172f70] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Save className="size-4" />
                                    {processing
                                        ? 'Updating...'
                                        : 'Update Password'}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </section>

            <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-5 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#008236]" />
                <div>
                    <p className="font-semibold text-[#364153]">
                        Security recommendation
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                        Enable two-factor authentication after updating your
                        password to protect privileged system access.
                    </p>
                </div>
            </div>
        </SuperAdminAccountSettingsLayout>
    );
}
