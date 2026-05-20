import { Head } from '@inertiajs/react';
import { PlatformSettingsPage } from '@/components/admin/platform-settings/PlatformSettingsPage';

export default function PlatformSettingsRoute() {
    return (
        <>
            <Head title="Platform Settings" />
            <PlatformSettingsPage />
        </>
    );
}
