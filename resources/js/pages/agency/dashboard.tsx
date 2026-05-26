import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import {
    AccessRequestsTable,
    DashboardActions,
    MetricGrid,
    ResearchByCategoryChart,
    ResearchByYearChart,
    ResearchUploadsTable,
} from '@/components/agency/AgencyDashboardWidgets';
import {
    filterAgencyResearchRecords,
    getAgencyDashboardData,
    updateAccessRequestStatus,
} from '@/lib/agency/agency-dashboard-service';
import { getAgencySession } from '@/lib/auth/agency-auth';
import type {
    AgencyAccessRequest,
    AgencyResearchRecord,
    DashboardMetric,
    ResearchCategoryPoint,
    ResearchYearPoint,
} from '@/types/agency-dashboard';
import type { AgencyAuthSession } from '@/types/auth';

type DashboardState = {
    metrics: DashboardMetric[];
    researchByYear: ResearchYearPoint[];
    researchByCategory: ResearchCategoryPoint[];
    researchRecords: AgencyResearchRecord[];
    accessRequests: AgencyAccessRequest[];
};

const emptyDashboardState: DashboardState = {
    metrics: [],
    researchByYear: [],
    researchByCategory: [],
    researchRecords: [],
    accessRequests: [],
};

export default function AgencyDashboardPage() {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
    const [dashboard, setDashboard] =
        useState<DashboardState>(emptyDashboardState);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        let isCurrent = true;

        getAgencyDashboardData().then((data) => {
            if (!isCurrent) {
                return;
            }

            setDashboard(data);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, []);

    const filteredResearchRecords = useMemo(
        () => filterAgencyResearchRecords(dashboard.researchRecords, search),
        [dashboard.researchRecords, search],
    );

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const handleDashboardAction = (
        action: 'upload' | 'manage' | 'requests',
    ) => {
        if (action === 'upload') {
            router.visit('/agency/upload');

            return;
        }

        if (action === 'manage') {
            router.visit('/agency/research-repository');

            return;
        }

        if (action === 'requests') {
            router.visit('/agency/access-requests');

            return;
        }
    };

    const handleResearchAction = (
        record: AgencyResearchRecord,
        action: 'view' | 'edit' | 'archive',
    ) => {
        if (action === 'edit' && record.repositoryId) {
            router.visit(
                `/agency/research-repository/${record.repositoryId}/edit`,
            );

            return;
        }

        if (action === 'archive') {
            router.visit(
                `/agency/research-repository?search=${encodeURIComponent(record.title)}`,
            );

            return;
        }

        router.visit(
            `/agency/research-repository?search=${encodeURIComponent(record.title)}`,
        );
    };

    const handleAccessDecision = (
        requestId: string,
        decision: 'approved' | 'denied',
    ) => {
        setDashboard((current) => ({
            ...current,
            accessRequests: updateAccessRequestStatus(
                current.accessRequests,
                requestId,
                decision,
            ),
        }));
    };

    return (
        <>
            <Head title="Agency Research Dashboard" />

            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <main className="px-4 py-8 lg:px-8">
                    <section>
                        <h1 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                            Agency Research Dashboard
                        </h1>
                        <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                            Manage and publish research studies contributed by
                            your institution.
                        </p>
                        <DashboardActions onAction={handleDashboardAction} />
                    </section>

                    {isLoading ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }, (_, index) => (
                                <div
                                    key={index}
                                    className="h-[94px] animate-pulse rounded-[14px] bg-white"
                                />
                            ))}
                        </div>
                    ) : (
                        <MetricGrid metrics={dashboard.metrics} />
                    )}

                    <section className="mt-6 grid gap-6 xl:grid-cols-2">
                        <ResearchByYearChart data={dashboard.researchByYear} />
                        <ResearchByCategoryChart
                            data={dashboard.researchByCategory}
                        />
                    </section>

                    <section className="mt-6">
                        <ResearchUploadsTable
                            records={filteredResearchRecords}
                            onAction={handleResearchAction}
                            onViewAll={() =>
                                router.visit('/agency/research-repository')
                            }
                        />
                    </section>

                    <section className="mt-6 scroll-mt-24">
                        <AccessRequestsTable
                            requests={dashboard.accessRequests}
                            onDecision={handleAccessDecision}
                            onViewAll={() =>
                                router.visit('/agency/access-requests')
                            }
                        />
                    </section>
                </main>
            </AgencyAdminLayout>
        </>
    );
}
