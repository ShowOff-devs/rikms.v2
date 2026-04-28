import { Head } from '@inertiajs/react';
import AgencyLoginForm from '@/components/auth/agency-login-form';
import AgencyPortalShell from '@/components/auth/agency-portal-shell';

export default function AgencyLoginPage() {
    return (
        <>
            <Head title="Agency Admin Portal" />

            <AgencyPortalShell
                activeNav="login"
                heroTitle="Regionwide Integrated Knowledge Management System"
                heroDescription="Discover research publications, articles, and knowledge outputs contributed by government agencies and institutions in the Davao Region."
            >
                <AgencyLoginForm />
            </AgencyPortalShell>
        </>
    );
}
