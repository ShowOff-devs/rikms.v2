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
    getAdminDashboardMetrics,
    getPendingModerationItems,
    getQuickManagementActions,
    getResearchByAgency,
    getResearchUploadsByYear,
    getSecurityStatus,
    getSystemActivityFeed,
    getUnreadNotificationCount,
} from '@/lib/admin/dashboard-service';
import { apiMessage } from '@/lib/api-client';
import type {
    AdminDashboardMetric,
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
    unreadNotificationsCount: number;
};

const emptyAdminDashboardState: AdminDashboardState = {
    metrics: [],
    researchByAgency: [],
    researchUploadsByYear: [],
    activityFeed: [],
    moderationItems: [],
    securityStatus: null,
    quickActions: [],
    unreadNotificationsCount: 0,
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
    const [reloadKey, setReloadKey] = useState(0);
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
            getUnreadNotificationCount(),
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
                    unreadNotificationsCount,
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
                        unreadNotificationsCount,
                    });
                    setError(null);
                },
            )
            .catch((requestError: unknown) => {
                if (!isCurrent) {
                    return;
                }

                setError(
                    apiMessage(requestError, 'Unable to load dashboard data.'),
                );
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [reloadKey]);

    const normalizedSearch = search.trim().toLowerCase();

    const retryDashboard = () => {
        setIsLoading(true);
        setError(null);
        setReloadKey((key) => key + 1);
    };

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

    return (
        <AdminLayout
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter recent activity and moderation..."
            unreadNotificationsCount={dashboard.unreadNotificationsCount}
        >
            <main className="px-4 py-8 lg:px-8">
                <AdminDashboardHeader />

                {error && (
                    <div
                        role="alert"
                        className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]"
                    >
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={retryDashboard}
                            className="rounded-[8px] border border-[#b91c1c]/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-[#fee2e2] focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:outline-none"
                        >
                            Retry
                        </button>
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
