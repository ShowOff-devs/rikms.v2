import { Head } from '@inertiajs/react';
import { AgencyAdminUsersPage } from '@/components/admin/agency-admin-users/AgencyAdminUsersPage';

export default function AgencyAdminUsersRoute() {
    return (
        <>
            <Head title="Agency Admin Users" />
            <AgencyAdminUsersPage />
        </>
    );
}
