import { Head } from '@inertiajs/react';
import { AdminDashboardPage } from '@/components/admin/dashboard/AdminDashboardPage';

export default function SystemDashboardPage() {
    return (
        <>
            <Head title="System Dashboard" />
            <AdminDashboardPage />
        </>
    );
}
