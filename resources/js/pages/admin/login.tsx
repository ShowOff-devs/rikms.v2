import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    Eye,
    EyeOff,
    KeyRound,
    LockKeyhole,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminAuthLayout from '@/layouts/AdminAuthLayout';

const usepLogo = '/assets/figma/usep-seal.png';
const dostLogo = '/assets/figma/dost-xi-logo.png';

export default function AdminLoginPage() {
    const [showPassword, setShowPassword] = useState(false);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // TODO: Connect to future super admin guard, 2FA challenge, and audit logging.
    }

    return (
        <>
            <Head title="Super Admin Login" />

            <AdminAuthLayout>
                <div className="flex justify-center">
                    <div className="flex h-12 items-center justify-center gap-6">
                        <img
                            src={usepLogo}
                            alt="University of Southeastern Philippines"
                            className="size-12 object-contain"
                        />
                        <div className="h-10 w-px bg-[#e5e7eb]" />
                        <img
                            src={dostLogo}
                            alt="Department of Science and Technology Region XI"
                            className="size-12 object-contain"
                        />
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <h2 className="text-[21.6px] leading-[32.4px] font-bold tracking-normal text-[#1e3a8a]">
                        System Administration Portal
                    </h2>
                    <p className="text-sm leading-5 text-[#99a1af]">
                        Sign in to access the governance dashboard.
                    </p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="admin-email"
                            className="text-sm leading-5 font-medium text-[#364153]"
                        >
                            Admin Email
                        </Label>
                        <Input
                            id="admin-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            placeholder="admin@rikms.gov.ph"
                            className="h-[42px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#364153] shadow-none placeholder:text-[#99a1af]"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label
                            htmlFor="admin-password"
                            className="text-sm leading-5 font-medium text-[#364153]"
                        >
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="admin-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                className="h-[42px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] px-4 pr-11 text-sm text-[#364153] shadow-none placeholder:text-[#99a1af]"
                            />
                            <button
                                type="button"
                                aria-label={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                                className="absolute top-1/2 right-3 flex size-[18px] -translate-y-1/2 items-center justify-center text-[#99a1af] transition-colors hover:text-[#1e3a8a]"
                                onClick={() =>
                                    setShowPassword((isVisible) => !isVisible)
                                }
                            >
                                {showPassword ? (
                                    <EyeOff
                                        className="size-[18px]"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Eye
                                        className="size-[18px]"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label
                            htmlFor="authentication-code"
                            className="flex items-center gap-1.5 text-sm leading-5 font-medium text-[#364153]"
                        >
                            <KeyRound
                                className="size-3.5 text-[#99a1af]"
                                aria-hidden="true"
                            />
                            Authentication Code
                        </Label>
                        <Input
                            id="authentication-code"
                            name="authentication_code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="Enter code from your authentication app"
                            className="h-[42px] rounded-[10px] border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm tracking-[1.4px] text-[#364153] shadow-none placeholder:text-[#99a1af]"
                        />
                        <p className="text-[11px] leading-[16.5px] text-[#99a1af]">
                            6-digit code from your authenticator app.
                        </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <Label
                            htmlFor="remember-device"
                            className="flex items-center gap-2 text-sm leading-5 font-medium text-[#4a5565]"
                        >
                            <Checkbox
                                id="remember-device"
                                name="remember_device"
                                className="size-4 rounded-[3px] border-[#d1d5db] shadow-none data-[state=checked]:border-[#1e3a8a] data-[state=checked]:bg-[#1e3a8a]"
                            />
                            Remember this device
                        </Label>
                        <a
                            href="#"
                            className="text-sm leading-5 font-medium whitespace-nowrap text-[#1e3a8a] hover:underline"
                        >
                            Forgot Password?
                        </a>
                    </div>

                    <Button
                        type="submit"
                        className="h-12 w-full rounded-[10px] bg-[#1e3a8a] text-base leading-6 font-semibold text-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] hover:bg-[#1d3478]"
                    >
                        <LockKeyhole className="size-4" aria-hidden="true" />
                        Access System Portal
                    </Button>
                </form>

                <div className="mt-6 border-t border-[#f3f4f6] pt-[21px]">
                    <div className="flex min-h-[60px] items-start gap-3 rounded-[10px] border border-[#fee685] bg-[#fffbeb] px-4 py-3">
                        <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-[#d97706]"
                            aria-hidden="true"
                        />
                        <div className="space-y-0.5">
                            <p className="text-xs leading-4 font-medium text-[#bb4d00]">
                                All login activities are monitored and logged.
                            </p>
                            <p className="text-xs leading-4 text-[rgba(225,113,0,0.7)]">
                                Unauthorized access is prohibited.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-[11px] leading-[16.5px] text-[#99a1af]">
                    Powered by{' '}
                    <span className="font-semibold text-[#6a7282]">
                        University of Southeastern Philippines (USeP)
                    </span>
                </p>
            </AdminAuthLayout>
        </>
    );
}
