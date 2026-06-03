import { Link, router } from '@inertiajs/react';
import { Building2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { signInToAgencyPortal } from '@/lib/auth/agency-auth';
import type { AgencyOption } from '@/types/auth';

type AgencyLoginFieldErrors = Partial<
    Record<'agencyId' | 'email' | 'password', string>
>;

type AgencyLoginFormState = {
    agencyId: string;
    email: string;
    password: string;
    remember: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usepSeal = '/assets/figma/usep-seal.png';
const dostSeal = '/assets/figma/dost-xi-logo.png';

type AgencyLoginFormProps = {
    agencies: AgencyOption[];
};

export default function AgencyLoginForm({ agencies }: AgencyLoginFormProps) {
    const [form, setForm] = useState<AgencyLoginFormState>({
        agencyId: '',
        email: '',
        password: '',
        remember: false,
    });
    const [errors, setErrors] = useState<AgencyLoginFieldErrors>({});
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedAgency = agencies.find(
        (agency) => agency.id === form.agencyId,
    );

    const updateField = <K extends keyof AgencyLoginFormState>(
        field: K,
        value: AgencyLoginFormState[K],
    ) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
        setSubmissionError(null);
    };

    const validate = () => {
        const nextErrors: AgencyLoginFieldErrors = {};

        if (agencies.length === 0) {
            nextErrors.agencyId =
                'No active agency accounts are available for login.';
        } else if (!form.agencyId) {
            nextErrors.agencyId = 'Please choose your agency account.';
        }

        if (!form.email.trim()) {
            nextErrors.email = 'Email address is required.';
        } else if (!emailPattern.test(form.email.trim())) {
            nextErrors.email = 'Enter a valid agency email address.';
        }

        if (!form.password.trim()) {
            nextErrors.password = 'Password is required.';
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            const session = await signInToAgencyPortal({
                agencyId: form.agencyId,
                email: form.email,
                password: form.password,
                remember: form.remember,
            });

            router.visit(session.redirect ?? '/agency/dashboard');
        } catch (error) {
            setSubmissionError(
                error instanceof Error
                    ? error.message
                    : 'Unable to sign in right now. Please try again.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-center gap-4">
                <img
                    src={usepSeal}
                    alt="University of Southeastern Philippines"
                    className="size-[52px] rounded-full object-contain"
                />
                <div className="h-8 w-px bg-[#d1d5db]" />
                <img
                    src={dostSeal}
                    alt="Department of Science and Technology Region XI"
                    className="h-[52px] w-[58px] object-contain"
                />
            </div>

            <div className="mt-6 text-center">
                <h1 className="text-[26.4px] leading-[39.6px] font-bold text-[#1e3a8a]">
                    Welcome Back
                </h1>
                <p className="mx-auto mt-2 max-w-[419px] text-sm leading-5 text-[#6b7280]">
                    Please select your agency and enter your credentials to
                    access the portal.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {submissionError && (
                    <AlertError
                        errors={[submissionError]}
                        title="Sign-in failed"
                    />
                )}

                <div className="space-y-1.5">
                    <label
                        htmlFor="agency"
                        className="text-sm leading-5 font-medium text-[#374151]"
                    >
                        Agency
                    </label>
                    <div className="relative">
                        <Building2 className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#9ca3af]" />
                        <Select
                            value={form.agencyId}
                            onValueChange={(value) =>
                                updateField('agencyId', value)
                            }
                        >
                            <SelectTrigger
                                id="agency"
                                aria-invalid={Boolean(errors.agencyId)}
                                className="h-[42px] w-full rounded-[10px] border-[#e5e7eb] bg-white pr-10 pl-11 text-left text-sm text-[#111827] shadow-none"
                            >
                                <SelectValue placeholder="Select your agency" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[10px]">
                                {agencies.map((agency) => (
                                    <SelectItem
                                        key={agency.id}
                                        value={agency.id}
                                    >
                                        {agency.shortName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {agencies.length === 0 ? (
                            <p className="mt-2 text-sm text-[#6b7280]">
                                No active agencies found.
                            </p>
                        ) : null}
                    </div>
                    <InputError message={errors.agencyId} />
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="email"
                        className="text-sm leading-5 font-medium text-[#374151]"
                    >
                        Email Address
                    </label>
                    <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                            updateField('email', event.target.value)
                        }
                        aria-invalid={Boolean(errors.email)}
                        autoComplete="email"
                        autoFocus
                        className="h-[42px] rounded-[10px] border-[#e5e7eb] bg-white px-4 text-sm shadow-none placeholder:text-[rgba(10,10,10,0.5)]"
                        placeholder={
                            selectedAgency
                                ? `Enter your ${selectedAgency.shortName} email`
                                : 'Enter your agency email'
                        }
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="password"
                        className="text-sm leading-5 font-medium text-[#374151]"
                    >
                        Password
                    </label>
                    <PasswordInput
                        id="password"
                        value={form.password}
                        onChange={(event) =>
                            updateField('password', event.target.value)
                        }
                        aria-invalid={Boolean(errors.password)}
                        autoComplete="current-password"
                        className="h-[42px] rounded-[10px] border-[#e5e7eb] bg-white px-4 pr-11 text-sm shadow-none placeholder:text-[rgba(10,10,10,0.5)]"
                        placeholder="Enter your password"
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex items-center gap-2 text-[#6b7280]">
                        <Checkbox
                            checked={form.remember}
                            onCheckedChange={(checked) =>
                                updateField('remember', checked === true)
                            }
                        />
                        <span className="font-medium">Remember Me</span>
                    </label>

                    <Link
                        href="/agency/forgot-password"
                        className="font-medium text-[#1e3a8a] hover:underline"
                    >
                        Forgot Password?
                    </Link>
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting || agencies.length === 0}
                    className="h-12 w-full rounded-[10px] bg-[#1e3a8a] text-base font-semibold text-white hover:bg-[#1b347b]"
                >
                    {isSubmitting ? <Spinner /> : null}
                    Sign In to Portal
                </Button>
            </form>

            <div className="mt-6 space-y-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-[#9ca3af]">
                    <ShieldCheck className="size-3.5" />
                    <span>Secure 256-bit encrypted connection</span>
                </div>
                <p className="mx-auto max-w-[320px] text-[12px] leading-[19.5px] text-[#9ca3af]">
                    Official research management portal of the Regionwide
                    Integrated Knowledge Management System.
                </p>
            </div>
        </div>
    );
}
