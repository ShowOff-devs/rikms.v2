import { useEffect, useState } from 'react';
import { AccessRequestStatusChart } from '@/components/admin/analytics/AccessRequestStatusChart';
import { AnalyticsEmptyState } from '@/components/admin/analytics/AnalyticsEmptyState';
import { AnalyticsFilters } from '@/components/admin/analytics/AnalyticsFilters';
import { AnalyticsMetricCards } from '@/components/admin/analytics/AnalyticsMetricCards';
import { ExportAnalyticsReportModal } from '@/components/admin/analytics/ExportAnalyticsReportModal';
import { MostAccessedResearchTable } from '@/components/admin/analytics/MostAccessedResearchTable';
import { PlatformUsageActivityChart } from '@/components/admin/analytics/PlatformUsageActivityChart';
import { ResearchByAgencyChart } from '@/components/admin/analytics/ResearchByAgencyChart';
import { ResearchByCategoryChart } from '@/components/admin/analytics/ResearchByCategoryChart';
import { ResearchUploadTrendsChart } from '@/components/admin/analytics/ResearchUploadTrendsChart';
import { SDGContributionChart } from '@/components/admin/analytics/SDGContributionChart';
import { SystemAnalyticsHeader } from '@/components/admin/analytics/SystemAnalyticsHeader';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    exportSystemAnalyticsReport,
    getSystemAnalytics,
} from '@/lib/admin/system-analytics-service';
import type {
    AccessRequestStatusSummary,
    AnalyticsExportOptions,
    MostAccessedResearch,
    PlatformUsageActivity,
    ResearchByAgency,
    ResearchByCategory,
    ResearchUploadTrend,
    SDGContribution,
    SystemAnalyticsFilterOptions,
    SystemAnalyticsFilters,
    SystemAnalyticsMetric,
} from '@/types/system-analytics';

type SystemAnalyticsState = {
    metrics: SystemAnalyticsMetric[];
    uploadTrends: ResearchUploadTrend[];
    researchByAgency: ResearchByAgency[];
    researchByCategory: ResearchByCategory[];
    sdgContribution: SDGContribution[];
    mostAccessedResearch: MostAccessedResearch[];
    accessRequestStatus: AccessRequestStatusSummary;
    platformUsageActivity: PlatformUsageActivity[];
    filterOptions: SystemAnalyticsFilterOptions;
};

const initialFilters: SystemAnalyticsFilters = {};

const emptyFilterOptions: SystemAnalyticsFilterOptions = {
    agencies: [],
    publicationYears: [],
    researchCategories: [],
    sdgs: [],
    documentTypes: [],
    accessTypes: [],
    statuses: [],
};

const emptyAnalyticsState: SystemAnalyticsState = {
    metrics: [],
    uploadTrends: [],
    researchByAgency: [],
    researchByCategory: [],
    sdgContribution: [],
    mostAccessedResearch: [],
    accessRequestStatus: {
        approved: 0,
        pending: 0,
        denied: 0,
    },
    platformUsageActivity: [],
    filterOptions: emptyFilterOptions,
};

function hasData(analytics: SystemAnalyticsState) {
    return analytics.metrics.some((metric) => metric.value > 0);
}

export function SystemAnalyticsPage() {
    const [search, setSearch] = useState('');
    const [filters, setFilters] =
        useState<SystemAnalyticsFilters>(initialFilters);
    const [analytics, setAnalytics] =
        useState<SystemAnalyticsState>(emptyAnalyticsState);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [headerRange, setHeaderRange] = useState('this-year');
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        setIsLoading(true);

        getSystemAnalytics(filters)
            .then((payload) => {
                if (!isCurrent) {
                    return;
                }

                setAnalytics(payload);
                setError(null);
            })
            .catch(() => {
                if (!isCurrent) {
                    return;
                }

                setError('Unable to load system analytics data.');
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [filters]);

    useEffect(() => {
        if (!feedback) {
            return undefined;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 4500);

        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const updateFilters = (nextFilters: SystemAnalyticsFilters) => {
        setFeedback(null);
        setFilters(nextFilters);
    };

    const clearFilters = () => {
        updateFilters(initialFilters);
    };

    const handleExport = async (options: AnalyticsExportOptions) => {
        setIsExporting(true);

        try {
            const result = await exportSystemAnalyticsReport(options);

            setFeedback(`${result.fileName} is ready for export workflow.`);
            setIsExportOpen(false);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AdminLayout search={search} onSearchChange={setSearch}>
            <main className="px-4 py-8 lg:px-8">
                <div className="mx-auto flex max-w-[1230px] flex-col gap-6">
                    <SystemAnalyticsHeader
                        selectedRange={headerRange}
                        isExporting={isExporting}
                        onRangeChange={setHeaderRange}
                        onExport={() => setIsExportOpen(true)}
                    />

                    <AnalyticsFilters
                        filters={filters}
                        options={analytics.filterOptions}
                        onFiltersChange={updateFilters}
                        onClearFilters={clearFilters}
                    />

                    {error && (
                        <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                            {error}
                        </div>
                    )}

                    {feedback && (
                        <div
                            role="status"
                            className="rounded-[10px] border border-[#b9f8cf] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#008236]"
                        >
                            {feedback}
                        </div>
                    )}

                    <AnalyticsMetricCards
                        metrics={analytics.metrics}
                        isLoading={isLoading}
                    />

                    {!isLoading && !hasData(analytics) ? (
                        <AnalyticsEmptyState onClearFilters={clearFilters} />
                    ) : (
                        <>
                            <section className="grid gap-6 xl:grid-cols-2">
                                <ResearchUploadTrendsChart
                                    data={analytics.uploadTrends}
                                    isLoading={isLoading}
                                />
                                <ResearchByAgencyChart
                                    data={analytics.researchByAgency}
                                    isLoading={isLoading}
                                />
                            </section>

                            <section className="grid gap-6 xl:grid-cols-2">
                                <ResearchByCategoryChart
                                    data={analytics.researchByCategory}
                                    isLoading={isLoading}
                                />
                                <SDGContributionChart
                                    data={analytics.sdgContribution}
                                    isLoading={isLoading}
                                />
                            </section>

                            <MostAccessedResearchTable
                                records={analytics.mostAccessedResearch}
                                isLoading={isLoading}
                            />

                            <section className="grid gap-6 xl:grid-cols-2">
                                <AccessRequestStatusChart
                                    data={analytics.accessRequestStatus}
                                    isLoading={isLoading}
                                />
                                <PlatformUsageActivityChart
                                    data={analytics.platformUsageActivity}
                                    isLoading={isLoading}
                                />
                            </section>
                        </>
                    )}
                </div>
            </main>

            <ExportAnalyticsReportModal
                open={isExportOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportOpen}
                onExport={handleExport}
            />
        </AdminLayout>
    );
}
