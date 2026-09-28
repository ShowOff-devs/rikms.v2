import { Head, usePage } from '@inertiajs/react';
import { MonitorCog } from 'lucide-react';
import { SuperAdminAppearancePage } from '@/components/admin/account-settings/SuperAdminAppearancePage';
import AppearanceTabs from '@/components/appearance-tabs';
import SettingsSection from '@/components/settings/settings-section';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editAppearance } from '@/routes/appearance';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: editAppearance(),
    },
];

export default function Appearance() {
    const { auth } = usePage().props;

    if (auth.adminPermissions?.includes('*')) {
        return (
            <>
                <Head title="Appearance" />
                <SuperAdminAppearancePage />
            </>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <SettingsLayout>
                <SettingsSection
                    icon={<MonitorCog className="size-5" />}
                    title="Appearance"
                    description="Choose how RIKMS looks on this device."
                >
                    <AppearanceTabs />
                </SettingsSection>
            </SettingsLayout>
        </AppLayout>
    );
}
