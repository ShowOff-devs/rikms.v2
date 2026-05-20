import { Head } from '@inertiajs/react';
import { AgencyManagementPage } from '@/components/admin/agencies/AgencyManagementPage';

export default function AgenciesRoute() {
    return (
        <>
            <Head title="Agency Management" />
            <AgencyManagementPage />
        </>
    );
}
