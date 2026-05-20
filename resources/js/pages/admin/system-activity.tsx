import { Head } from '@inertiajs/react';
import { SystemActivityPage } from '@/components/admin/system-activity/SystemActivityPage';

export default function AdminSystemActivityRoute() {
    return (
        <>
            <Head title="System Notifications & Activity Logs" />
            <SystemActivityPage />
        </>
    );
}
