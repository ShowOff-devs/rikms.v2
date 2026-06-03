import { Head } from '@inertiajs/react';
import AgencyLoginForm from '@/components/auth/agency-login-form';
import AgencyPortalShell from '@/components/auth/agency-portal-shell';
import type { AgencyOption } from '@/types/auth';

type AgencyLoginPageProps = {
    agencies: AgencyOption[];
};

export default function AgencyLoginPage({ agencies }: AgencyLoginPageProps) {
    return (
        <>
            <Head title="Agency Admin Portal" />

            <AgencyPortalShell
                activeNav="login"
                heroTitle="Regionwide Integrated Knowledge Management System"
                heroDescription="Discover research publications, articles, and knowledge outputs contributed by government agencies and institutions in the Davao Region."
            >
                <AgencyLoginForm agencies={agencies} />
            </AgencyPortalShell>
        </>
    );
}
