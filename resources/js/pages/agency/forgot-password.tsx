import { Head } from '@inertiajs/react';
import AgencyForgotPasswordForm from '@/components/auth/agency-forgot-password-form';
import AgencyPortalShell from '@/components/auth/agency-portal-shell';
import type { AgencyOption, TurnstileConfiguration } from '@/types/auth';

type AgencyForgotPasswordPageProps = {
    agencies: AgencyOption[];
    turnstile: TurnstileConfiguration;
};

export default function AgencyForgotPasswordPage({
    agencies,
    turnstile,
}: AgencyForgotPasswordPageProps) {
    return (
        <>
            <Head title="Reset Agency Password" />

            <AgencyPortalShell
                activeNav="login"
                heroTitle="Regionwide Integrated Knowledge Management System"
                heroDescription="Recover agency access quickly so authorized staff can continue managing submissions, metadata, and institutional research records."
            >
                <AgencyForgotPasswordForm
                    agencies={agencies}
                    turnstile={turnstile}
                />
            </AgencyPortalShell>
        </>
    );
}
