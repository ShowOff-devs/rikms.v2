import { Head } from '@inertiajs/react';
import AgencyForgotPasswordForm from '@/components/auth/agency-forgot-password-form';
import AgencyPortalShell from '@/components/auth/agency-portal-shell';
import type { AgencyOption } from '@/types/auth';

type AgencyForgotPasswordPageProps = {
    agencies: AgencyOption[];
};

export default function AgencyForgotPasswordPage({
    agencies,
}: AgencyForgotPasswordPageProps) {
    return (
        <>
            <Head title="Reset Agency Password" />

            <AgencyPortalShell
                activeNav="login"
                heroTitle="Regionwide Integrated Knowledge Management System"
                heroDescription="Recover agency access quickly so authorized staff can continue managing submissions, metadata, and institutional research records."
            >
                <AgencyForgotPasswordForm agencies={agencies} />
            </AgencyPortalShell>
        </>
    );
}
