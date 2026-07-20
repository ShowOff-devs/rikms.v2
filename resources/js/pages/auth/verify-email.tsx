// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Verify your email address"
            description="A verification link has been sent to your email address. Please verify your email before continuing."
        >
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <div
                    role="status"
                    className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                >
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} className="w-full">
                            {processing && <Spinner />}
                            Resend Verification Email
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Log out
                        </TextLink>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
