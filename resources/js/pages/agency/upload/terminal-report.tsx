import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import UploadWizard from '@/components/upload/wizard/UploadWizard';
import { terminalReportUploadConfig } from '@/config/upload/terminalReportUploadConfig';
import { useAgencySession } from '@/lib/auth/agency-auth';

export default function TerminalReportUploadPage() {
    const session = useAgencySession();
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    return (
        <>
            <Head title="Terminal Report Upload" />
            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <UploadWizard config={terminalReportUploadConfig} />
            </AgencyAdminLayout>
        </>
    );
}
