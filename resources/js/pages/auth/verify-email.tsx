import { Form, Head, router } from '@inertiajs/react';
import { useEffect } from 'react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

type VerificationUser = {
    email_verified_at: string | null;
    role?: string;
    roles?: string[];
};

type VerificationStatusResponse = {
    data?: VerificationUser;
};

function dashboardFor(user: VerificationUser) {
    const roles = new Set([user.role, ...(user.roles ?? [])]);

    if (roles.has('agency_admin')) {
        return '/agency/dashboard';
    }

    if (roles.has('super_admin')) {
        return '/admin/dashboard';
    }

    return '/dashboard';
}

export default function VerifyEmail({ status }: { status?: string }) {
    useEffect(() => {
        const controller = new AbortController();
        let timer: number | undefined;
        let requestInProgress = false;
        let stopped = false;

        const scheduleCheck = () => {
            if (!stopped) {
                timer = window.setTimeout(checkVerification, 2500);
            }
        };

        const checkVerification = async () => {
            if (stopped || requestInProgress) {
                return;
            }

            requestInProgress = true;

            try {
                const response = await fetch('/api/auth/user', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    return;
                }

                const payload =
                    (await response.json()) as VerificationStatusResponse;
                const user = payload.data;

                if (user?.email_verified_at) {
                    stopped = true;
                    router.visit(dashboardFor(user), { replace: true });
                }
            } catch (error) {
                if (
                    !(
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    )
                ) {
                    // A temporary network failure is retried by the next poll.
                }
            } finally {
                requestInProgress = false;
                scheduleCheck();
            }
        };

        const checkWhenVisible = () => {
            if (document.visibilityState === 'visible') {
                window.clearTimeout(timer);
                void checkVerification();
            }
        };

        void checkVerification();
        window.addEventListener('focus', checkWhenVisible);
        document.addEventListener('visibilitychange', checkWhenVisible);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            controller.abort();
            window.removeEventListener('focus', checkWhenVisible);
            document.removeEventListener('visibilitychange', checkWhenVisible);
        };
    }, []);

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

            <div
                role="status"
                className="mb-5 flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
            >
                <Spinner />
                Waiting for confirmation. This page will continue to your
                dashboard automatically.
            </div>

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
