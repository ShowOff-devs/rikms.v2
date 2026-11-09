// Components
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TurnstileWidget from '@/components/public/turnstile-widget';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { email } from '@/routes/password';
import type { TurnstileConfiguration } from '@/types/auth';

export default function ForgotPassword({
    status,
    turnstile,
}: {
    status?: string;
    turnstile: TurnstileConfiguration;
}) {
    const [captchaToken, setCaptchaToken] = useState('');
    const [captchaError, setCaptchaError] = useState('');
    const [captchaResetKey, setCaptchaResetKey] = useState(0);

    return (
        <AuthLayout
            title="Forgot your password?"
            description="Enter your email address and we will send you a secure password reset link."
        >
            <Head title="Forgot password" />

            {status && (
                <div
                    role="status"
                    className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                >
                    {status}
                </div>
            )}

            <div className="space-y-6">
                <Form
                    {...email.form()}
                    onError={() => {
                        setCaptchaToken('');
                        setCaptchaResetKey((current) => current + 1);
                    }}
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder="email@example.com"
                                />

                                <InputError message={errors.email} />
                            </div>

                            <input
                                type="hidden"
                                name="captcha_token"
                                value={captchaToken}
                            />
                            {turnstile.enabled ? (
                                <div>
                                    <TurnstileWidget
                                        id="password-reset-turnstile"
                                        enabled
                                        siteKey={turnstile.siteKey}
                                        action={turnstile.action}
                                        resetKey={captchaResetKey}
                                        onTokenChange={setCaptchaToken}
                                        onError={setCaptchaError}
                                    />
                                    <InputError
                                        message={
                                            errors.captcha_token || captchaError
                                        }
                                    />
                                </div>
                            ) : null}

                            <div className="my-6 flex items-center justify-start">
                                <Button
                                    className="w-full"
                                    disabled={
                                        processing ||
                                        (turnstile.enabled &&
                                            (!turnstile.siteKey ||
                                                !captchaToken))
                                    }
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}
                                    Send Reset Link
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Or, return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </div>
            </div>
        </AuthLayout>
    );
}
