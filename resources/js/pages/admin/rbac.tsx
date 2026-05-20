import { Head } from '@inertiajs/react';
import { RBACManagementPage } from '@/components/admin/rbac/RBACManagementPage';

export default function RBACRoute() {
    return (
        <>
            <Head title="RBAC Management" />
            <RBACManagementPage />
        </>
    );
}
