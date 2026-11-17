import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import UploadWizard from '@/components/upload/wizard/UploadWizard';
import { projectAccomplishmentUploadConfig } from '@/config/upload/projectAccomplishmentUploadConfig';
import { useAgencySession } from '@/lib/auth/agency-auth';
import { browserRecoveryUserId } from '@/lib/upload/draft-recovery';

type ProjectAccomplishmentUploadPageProps = {
    researchId?: string;
};

export default function ProjectAccomplishmentUploadPage({
    researchId,
}: ProjectAccomplishmentUploadPageProps) {
    const session = useAgencySession();
    const [search, setSearch] = useState('');
    const agencyName = session?.agencyName.trim() ?? '';
    const recoveryUserId = session
        ? String(session.userId ?? browserRecoveryUserId(session.email))
        : '';

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

    if (!agencyName) {
        return (
            <>
                <Head title="Project Accomplishment Report Upload" />
                <AgencyAdminLayout
                    session={session}
                    search={search}
                    onSearchChange={setSearch}
                >
                    <main className="px-4 py-8 lg:px-8">
                        <div
                            role="alert"
                            className="mx-auto max-w-3xl rounded-[14px] border border-[#fecaca] bg-[#fef2f2] p-6 text-sm text-[#991b1b] shadow-sm"
                        >
                            <h1 className="text-base font-bold">
                                Agency context is unavailable
                            </h1>
                            <p className="mt-2 leading-6">
                                We could not identify the agency assigned to
                                your account. Project Accomplishment Report
                                uploads are blocked until an administrator
                                restores your agency assignment.
                            </p>
                        </div>
                    </main>
                </AgencyAdminLayout>
            </>
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
                <UploadWizard
                    config={projectAccomplishmentUploadConfig}
                    initialResearchId={researchId}
                    agencyName={agencyName}
                    recoveryScope={{
                        agencyId: session.agencyId,
                        userId: recoveryUserId,
                        documentType: 'project-accomplishment',
                    }}
                />
            </AgencyAdminLayout>
        </>
    );
}
