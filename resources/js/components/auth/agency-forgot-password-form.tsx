import { Link } from '@inertiajs/react';
import { CheckCircle2, Mail } from 'lucide-react';
import { useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    requestAgencyPasswordReset,
} from '@/lib/auth/agency-auth';
import type { AgencyOption } from '@/types/auth';

type ForgotPasswordErrors = Partial<Record<'agencyId' | 'email', string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AgencyForgotPasswordFormProps = {
    agencies: AgencyOption[];
};

export default function AgencyForgotPasswordForm({
    agencies,
}: AgencyForgotPasswordFormProps) {
    const [agencyId, setAgencyId] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<ForgotPasswordErrors>({});
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const nextErrors: ForgotPasswordErrors = {};

        if (agencies.length === 0) {
            nextErrors.agencyId =
                'No active agency accounts are available for password reset.';
        } else if (!agencyId) {
            nextErrors.agencyId =
                'Please choose the agency account you need help with.';
        }

        if (!email.trim()) {
            nextErrors.email = 'Email address is required.';
        } else if (!emailPattern.test(email.trim())) {
            nextErrors.email = 'Enter a valid agency email address.';
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
        setRequestError(null);
        setStatusMessage(null);

        try {
            const response = await requestAgencyPasswordReset({
                agencyId,
                email,
            });

            setStatusMessage(response.message);
        } catch (error) {
            setRequestError(
                error instanceof Error
                    ? error.message
                    : 'Unable to send password reset instructions right now.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="text-center">
                <h1 className="text-[26.4px] leading-[39.6px] font-bold text-[#1e3a8a]">
                    Reset Agency Password
                </h1>
                <p className="mt-2 text-sm leading-5 text-[#6b7280]">
                    Enter your agency account details and we&apos;ll send
                    password reset instructions.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {requestError && (
                    <AlertError
                        errors={[requestError]}
                        title="Reset request failed"
                    />
                )}

                {statusMessage && (
                    <Alert className="border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">
                        <CheckCircle2 className="size-4" />
                        <AlertTitle>Request submitted</AlertTitle>
                        <AlertDescription>{statusMessage}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-1.5">
                    <label
                        htmlFor="reset-agency"
                        className="text-sm leading-5 font-medium text-[#374151]"
                    >
                        Agency
                    </label>
                    <Select
                        value={agencyId}
                        onValueChange={(value) => {
                            setAgencyId(value);
                            setErrors((current) => ({
                                ...current,
                                agencyId: undefined,
                            }));
                        }}
                    >
                        <SelectTrigger
                            id="reset-agency"
                            className="h-[42px] w-full rounded-[10px] border-[#e5e7eb] bg-white text-left shadow-none"
                            aria-invalid={Boolean(errors.agencyId)}
                        >
                            <SelectValue placeholder="Select your agency" />
                        </SelectTrigger>
                        <SelectContent>
                            {agencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
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
                    <InputError message={errors.agencyId} />
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="reset-email"
                        className="text-sm leading-5 font-medium text-[#374151]"
                    >
                        Email Address
                    </label>
                    <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            setErrors((current) => ({
                                ...current,
                                email: undefined,
                            }));
                        }}
                        className="h-[42px] rounded-[10px] border-[#e5e7eb] bg-white px-4 shadow-none placeholder:text-[rgba(10,10,10,0.5)]"
                        placeholder="admin@agency.gov.ph"
                        aria-invalid={Boolean(errors.email)}
                    />
                    <InputError message={errors.email} />
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting || agencies.length === 0}
                    className="h-12 w-full rounded-[10px] bg-[#1e3a8a] text-base font-semibold text-white hover:bg-[#1b347b]"
                >
                    {isSubmitting ? <Spinner /> : <Mail className="size-4.5" />}
                    Send Reset Instructions
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[#6b7280]">
                <Link
                    href="/agency/login"
                    className="font-medium text-[#1e3a8a] hover:underline"
                >
                    Back to Agency Login
                </Link>
            </div>
        </div>
    );
}
