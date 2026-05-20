import { Head } from '@inertiajs/react';
import { SystemAnalyticsPage } from '@/components/admin/analytics/SystemAnalyticsPage';

export default function AdminAnalyticsRoute() {
    return (
        <>
            <Head title="System Analytics" />
            <SystemAnalyticsPage />
        </>
    );
}
