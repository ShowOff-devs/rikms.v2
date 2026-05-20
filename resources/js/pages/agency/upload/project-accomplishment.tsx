import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import UploadWizard from '@/components/upload/wizard/UploadWizard';
import { projectAccomplishmentUploadConfig } from '@/config/upload/projectAccomplishmentUploadConfig';
import { getAgencySession } from '@/lib/auth/agency-auth';
import type { AgencyAuthSession } from '@/types/auth';

export default function ProjectAccomplishmentUploadPage() {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
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
            <Head title="Project Accomplishment Report Upload" />
            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <UploadWizard config={projectAccomplishmentUploadConfig} />
            </AgencyAdminLayout>
        </>
    );
}
