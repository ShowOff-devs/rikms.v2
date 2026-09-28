import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { AccessRequestsStatusChart } from '@/components/analytics/AccessRequestsStatusChart';
import { AnalyticsDrillDownDialog } from '@/components/analytics/AnalyticsDrillDownDialog';
import type { AnalyticsDrillDown } from '@/components/analytics/AnalyticsDrillDownDialog';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { CategoryDistributionChart } from '@/components/analytics/CategoryDistributionChart';
import { DownloadActivityChart } from '@/components/analytics/DownloadActivityChart';
import { ExportReportDialog } from '@/components/analytics/ExportReportDialog';
import { MostAccessedResearchTable } from '@/components/analytics/MostAccessedResearchTable';
import { ProjectReportAnalyticsSection } from '@/components/analytics/ProjectReportAnalyticsSection';
import { SDGContributionChart } from '@/components/analytics/SDGContributionChart';
import { SummaryMetricCards } from '@/components/analytics/SummaryMetricCards';
import { YearlyPublicationsChart } from '@/components/analytics/YearlyPublicationsChart';
import {
    exportAgencyAnalyticsReport,
    getAgencyAnalytics,
    getAnalyticsFilterOptions,
} from '@/lib/analytics/analytics-service';
import { useAgencySession } from '@/lib/auth/agency-auth';
import type {
    AgencyAnalyticsPayload,
    AnalyticsFilters as AnalyticsFiltersValue,
    MostAccessedResearch,
} from '@/types/analytics';

const initialFilters: AnalyticsFiltersValue = {
    year: 'all',
    documentType: 'all',
    category: 'all',
    sdg: 'all',
    accessType: 'all',
    status: 'all',
};

type AnalyticsView = 'repository' | 'project-reports';

export function AgencyAnalyticsPage() {
    const session = useAgencySession();
    const [activeView, setActiveView] = useState<AnalyticsView>(() =>
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('view') ===
            'project-reports'
            ? 'project-reports'
            : 'repository',
    );
    const [filters, setFilters] =
        useState<AnalyticsFiltersValue>(initialFilters);
    const [analytics, setAnalytics] = useState<AgencyAnalyticsPayload | null>(
        null,
    );
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [feedbackIsError, setFeedbackIsError] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [drillDown, setDrillDown] = useState<AnalyticsDrillDown | null>(null);

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        const url = new URL(window.location.href);

        if (activeView === 'project-reports') {
            url.searchParams.set('view', 'project-reports');
        } else {
            url.searchParams.delete('view');
        }

        window.history.replaceState(
            window.history.state,
            '',
            `${url.pathname}${url.search}`,
        );
    }, [activeView]);

    useEffect(() => {
        if (activeView !== 'repository') {
            return;
        }

        let isCurrent = true;

        setIsLoading(true);
        setLoadError('');

        void getAgencyAnalytics(filters)
            .then((payload) => {
                if (!isCurrent) {
                    return;
                }

                setAnalytics(payload);
                setIsLoading(false);
            })
            .catch(() => {
                if (!isCurrent) {
                    return;
                }

                setAnalytics(null);
                setLoadError(
                    'Unable to load repository analytics. Review the selected filters and try again.',
                );
                setIsLoading(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [activeView, filters]);

    const filterOptions =
        analytics?.filterOptions ?? getAnalyticsFilterOptions();

    const visibleMostAccessed = useMemo(() => {
        const records = analytics?.mostAccessedResearch ?? [];
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
            return records;
        }

        return records.filter((record) =>
            [record.title, record.category, record.year ?? 'Unknown']
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch),
        );
    }, [analytics?.mostAccessedResearch, search]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const updateFilters = (nextFilters: AnalyticsFiltersValue) => {
        setIsLoading(true);
        setFilters(nextFilters);
        setFeedback('');
        setFeedbackIsError(false);
        setLoadError('');
    };

    const handleExportConfirm = async (format: 'pdf' | 'csv') => {
        setIsExporting(true);
        setFeedback('');
        setFeedbackIsError(false);

        try {
            const result = await exportAgencyAnalyticsReport(filters, format);

            setIsExportOpen(false);

            if (result.success) {
                setFeedback(`${result.fileName} is ready for download.`);
            }
        } catch {
            setIsExportOpen(false);
            setFeedback(
                'Unable to export repository analytics. Please try again.',
            );
            setFeedbackIsError(true);
        } finally {
            setIsExporting(false);
        }
    };

    const openChartDrillDown = (title: string, description: string) => {
        setDrillDown({ title, description });
    };

    const openResearchDrillDown = (record: MostAccessedResearch) => {
        setDrillDown({
            title: record.title,
            description:
                'Repository activity detail for the selected research record.',
            stats: [
                { label: 'Category', value: record.category },
                { label: 'Year', value: record.year ?? 'Unknown' },
                {
                    label: 'Downloads',
                    value: record.downloads.toLocaleString(),
                },
                { label: 'Views', value: record.views.toLocaleString() },
            ],
        });
    };

    return (
        <>
            <Head title="Agency Research Analytics" />

            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <main className="px-4 py-8 lg:px-[47px]">
                    <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
                        <AnalyticsHeader
                            onExport={
                                activeView === 'repository'
                                    ? () => setIsExportOpen(true)
                                    : undefined
                            }
                        />

                        <AnalyticsViewSwitch
                            activeView={activeView}
                            onViewChange={(view) => {
                                setActiveView(view);
                                setFeedback('');
                                setFeedbackIsError(false);
                            }}
                        />

                        {activeView === 'project-reports' ? (
                            <ProjectReportAnalyticsSection />
                        ) : (
                            <>
                                <AnalyticsFilters
                                    filters={filters}
                                    options={filterOptions}
                                    onFiltersChange={updateFilters}
                                    onClearFilters={() =>
                                        updateFilters(initialFilters)
                                    }
                                />

                                {feedback ? (
                                    <div
                                        role={
                                            feedbackIsError ? 'alert' : 'status'
                                        }
                                        className={`rounded-[10px] border px-4 py-3 text-sm font-medium ${
                                            feedbackIsError
                                                ? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
                                                : 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]'
                                        }`}
                                    >
                                        {feedback}
                                    </div>
                                ) : null}

                                {loadError ? (
                                    <div
                                        role="alert"
                                        className="rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-5 py-6 text-sm font-medium text-[#b91c1c]"
                                    >
                                        {loadError}
                                    </div>
                                ) : isLoading || !analytics ? (
                                    <AnalyticsLoadingState />
                                ) : (
                                    <>
                                        <SummaryMetricCards
                                            metrics={analytics.summaryMetrics}
                                        />

                                        <section className="grid gap-5 xl:grid-cols-2">
                                            <YearlyPublicationsChart
                                                data={
                                                    analytics.yearlyPublications
                                                }
                                                onSelect={openChartDrillDown}
                                            />
                                            <CategoryDistributionChart
                                                data={
                                                    analytics.categoryDistribution
                                                }
                                                onSelect={openChartDrillDown}
                                            />
                                        </section>

                                        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                                            <SDGContributionChart
                                                data={
                                                    analytics.sdgContributions
                                                }
                                                onSelect={openChartDrillDown}
                                            />
                                            <AccessRequestsStatusChart
                                                data={
                                                    analytics.accessRequestBreakdown
                                                }
                                                onSelect={openChartDrillDown}
                                            />
                                        </section>

                                        <DownloadActivityChart
                                            data={analytics.downloadTrends}
                                            onSelect={openChartDrillDown}
                                        />

                                        <MostAccessedResearchTable
                                            records={visibleMostAccessed}
                                            onSelect={openResearchDrillDown}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </AgencyAdminLayout>

            <ExportReportDialog
                open={isExportOpen}
                filters={filters}
                isExporting={isExporting}
                onOpenChange={setIsExportOpen}
                onConfirm={handleExportConfirm}
            />

            <AnalyticsDrillDownDialog
                drillDown={drillDown}
                open={Boolean(drillDown)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDrillDown(null);
                    }
                }}
            />
        </>
    );
}

function AnalyticsViewSwitch({
    activeView,
    onViewChange,
}: {
    activeView: AnalyticsView;
    onViewChange: (view: AnalyticsView) => void;
}) {
    const tabs: Array<{
        id: AnalyticsView;
        label: string;
        description: string;
    }> = [
        {
            id: 'repository',
            label: 'Repository Analytics',
            description: 'Research outputs, downloads, and access activity',
        },
        {
            id: 'project-reports',
            label: 'Project Report Analytics',
            description: 'Terminal Reports and Project Accomplishment Reports',
        },
    ];

    return (
        <div
            role="tablist"
            aria-label="Agency analytics sections"
            className="grid gap-2 rounded-[14px] border border-[#e5e7eb] bg-white p-2 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)] md:grid-cols-2"
        >
            {tabs.map((tab) => {
                const isActive = activeView === tab.id;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onViewChange(tab.id)}
                        className={`rounded-[10px] px-4 py-3 text-left transition ${
                            isActive
                                ? 'bg-[#1e3a8a] text-white'
                                : 'bg-[#f9fafb] text-[#4a5565] hover:bg-[#f3f4f6]'
                        }`}
                    >
                        <span className="block text-sm font-semibold">
                            {tab.label}
                        </span>
                        <span
                            className={`mt-1 block text-xs leading-4 ${
                                isActive ? 'text-[#dbeafe]' : 'text-[#6a7282]'
                            }`}
                        >
                            {tab.description}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function AnalyticsLoadingState() {
    return (
        <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[134px] animate-pulse rounded-[14px] bg-white"
                    />
                ))}
            </section>
            <section className="grid gap-5 xl:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[340px] animate-pulse rounded-[14px] bg-white"
                    />
                ))}
            </section>
            <div className="h-[360px] animate-pulse rounded-[14px] bg-white" />
            <div className="h-[420px] animate-pulse rounded-[14px] bg-white" />
        </>
    );
}
