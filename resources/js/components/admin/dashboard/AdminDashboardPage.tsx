import { useEffect, useMemo, useState } from 'react';
import { AdminDashboardDialog } from '@/components/admin/dashboard/AdminDashboardDialog';
import { AdminDashboardHeader } from '@/components/admin/dashboard/AdminDashboardHeader';
import { AdminMetricCards } from '@/components/admin/dashboard/AdminMetricCards';
import { PendingModerationPanel } from '@/components/admin/dashboard/PendingModerationPanel';
import { QuickManagementActions } from '@/components/admin/dashboard/QuickManagementActions';
import { ResearchByAgencyChart } from '@/components/admin/dashboard/ResearchByAgencyChart';
import { ResearchUploadsByYearChart } from '@/components/admin/dashboard/ResearchUploadsByYearChart';
import { SecurityStatusPanel } from '@/components/admin/dashboard/SecurityStatusPanel';
import { SystemActivityFeed } from '@/components/admin/dashboard/SystemActivityFeed';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    generateSystemReport,
    getAdminDashboardMetrics,
    getPendingModerationItems,
    getQuickManagementActions,
    getResearchByAgency,
    getResearchUploadsByYear,
    getSecurityStatus,
    getSystemActivityFeed,
} from '@/lib/admin/dashboard-service';
import type {
    AdminDashboardMetric,
    GeneratedSystemReport,
    ModerationItem,
    QuickManagementAction,
    ResearchByAgency,
    ResearchUploadByYear,
    SecurityStatus,
    SystemActivity,
} from '@/types/admin-dashboard';

type AdminDashboardState = {
    metrics: AdminDashboardMetric[];
    researchByAgency: ResearchByAgency[];
    researchUploadsByYear: ResearchUploadByYear[];
    activityFeed: SystemActivity[];
    moderationItems: ModerationItem[];
    securityStatus: SecurityStatus | null;
    quickActions: QuickManagementAction[];
};

const emptyAdminDashboardState: AdminDashboardState = {
    metrics: [],
    researchByAgency: [],
    researchUploadsByYear: [],
    activityFeed: [],
    moderationItems: [],
    securityStatus: null,
    quickActions: [],
};

function matchesSearch(value: string, search: string) {
    return value.toLowerCase().includes(search);
}

export function AdminDashboardPage() {
    const [dashboard, setDashboard] = useState<AdminDashboardState>(
        emptyAdminDashboardState,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [generatedReport, setGeneratedReport] =
        useState<GeneratedSystemReport | null>(null);
    const [selectedModerationItem, setSelectedModerationItem] =
        useState<ModerationItem | null>(null);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getAdminDashboardMetrics(),
            getResearchByAgency(),
            getResearchUploadsByYear(),
            getSystemActivityFeed(),
            getPendingModerationItems(),
            getSecurityStatus(),
            getQuickManagementActions(),
        ])
            .then(
                ([
                    metrics,
                    agencyData,
                    uploadData,
                    activityFeed,
                    moderationItems,
                    security,
                    quickActions,
                ]) => {
                    if (!isCurrent) {
                        return;
                    }

                    setDashboard({
                        metrics,
                        researchByAgency: agencyData,
                        researchUploadsByYear: uploadData,
                        activityFeed,
                        moderationItems,
                        securityStatus: security,
                        quickActions,
                    });
                    setError(null);
                },
            )
            .catch(() => {
                if (!isCurrent) {
                    return;
                }

                setError('Unable to load dashboard data.');
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    const normalizedSearch = search.trim().toLowerCase();

    const filteredActivityFeed = useMemo(() => {
        if (!normalizedSearch) {
            return dashboard.activityFeed;
        }

        return dashboard.activityFeed.filter((activity) =>
            matchesSearch(
                [
                    activity.actor,
                    activity.agency,
                    activity.action,
                    activity.target,
                    activity.type,
                ]
                    .filter(Boolean)
                    .join(' '),
                normalizedSearch,
            ),
        );
    }, [dashboard.activityFeed, normalizedSearch]);

    const filteredModerationItems = useMemo(() => {
        if (!normalizedSearch) {
            return dashboard.moderationItems;
        }

        return dashboard.moderationItems.filter((item) =>
            matchesSearch(
                [
                    item.title,
                    item.agency,
                    item.issueType,
                    item.severity,
                    item.statusLabel,
                ].join(' '),
                normalizedSearch,
            ),
        );
    }, [dashboard.moderationItems, normalizedSearch]);

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        setGeneratedReport(null);

        try {
            const report = await generateSystemReport();
            setGeneratedReport(report);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <AdminLayout search={search} onSearchChange={setSearch}>
            <main className="px-4 py-8 lg:px-8">
                <AdminDashboardHeader
                    isGeneratingReport={isGeneratingReport}
                    generatedReport={generatedReport}
                    onGenerateReport={handleGenerateReport}
                />

                {error && (
                    <div className="mt-6 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                        {error}
                    </div>
                )}

                <AdminMetricCards
                    metrics={dashboard.metrics}
                    isLoading={isLoading}
                />

                <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <ResearchByAgencyChart
                        data={dashboard.researchByAgency}
                        isLoading={isLoading}
                    />
                    <ResearchUploadsByYearChart
                        data={dashboard.researchUploadsByYear}
                        isLoading={isLoading}
                    />
                </section>

                <section className="mt-6 grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
                    <SystemActivityFeed
                        activities={filteredActivityFeed}
                        isLoading={isLoading}
                    />
                    <PendingModerationPanel
                        items={filteredModerationItems}
                        isLoading={isLoading}
                        onViewDetails={setSelectedModerationItem}
                    />
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <SecurityStatusPanel
                        status={dashboard.securityStatus}
                        isLoading={isLoading}
                    />
                    <QuickManagementActions
                        actions={dashboard.quickActions}
                        isLoading={isLoading}
                    />
                </section>
            </main>

            <AdminDashboardDialog
                item={selectedModerationItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedModerationItem(null);
                    }
                }}
            />
        </AdminLayout>
    );
}
