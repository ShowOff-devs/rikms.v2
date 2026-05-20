import { Head } from '@inertiajs/react';
import { SecurityCenterPage } from '@/components/admin/security-center/SecurityCenterPage';

export default function AdminSecurityCenterRoute() {
    return (
        <>
            <Head title="Security Center" />
            <SecurityCenterPage />
        </>
    );
}
