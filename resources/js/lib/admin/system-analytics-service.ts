import { fetchApi } from '@/lib/api-client';
import type {
    AccessRequestStatusSummary,
    AnalyticsExportOptions,
    AnalyticsExportResult,
    MostAccessedResearch,
    PlatformUsageActivity,
    ResearchByAgency,
    ResearchByCategory,
    ResearchUploadTrend,
    SDGContribution,
    SystemAnalyticsFilterOptions,
    SystemAnalyticsFilters,
    SystemAnalyticsMetric,
    SystemAnalyticsPayload,
} from '@/types/system-analytics';

function params(filters: SystemAnalyticsFilters = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
            searchParams.set(key, value);
        }
    });

    return searchParams.toString();
}

export async function getSystemAnalyticsMetrics(
    filters: SystemAnalyticsFilters = {},
): Promise<SystemAnalyticsMetric[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.metrics;
}

export async function getResearchUploadTrends(
    filters: SystemAnalyticsFilters = {},
): Promise<ResearchUploadTrend[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.uploadTrends;
}

export async function getResearchByAgency(
    filters: SystemAnalyticsFilters = {},
): Promise<ResearchByAgency[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.researchByAgency;
}

export async function getResearchByCategory(
    filters: SystemAnalyticsFilters = {},
): Promise<ResearchByCategory[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.researchByCategory;
}

export async function getSDGContribution(
    filters: SystemAnalyticsFilters = {},
): Promise<SDGContribution[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.sdgContribution;
}

export async function getMostAccessedResearch(
    filters: SystemAnalyticsFilters = {},
): Promise<MostAccessedResearch[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.mostAccessedResearch;
}

export async function getAccessRequestStatusSummary(
    filters: SystemAnalyticsFilters = {},
): Promise<AccessRequestStatusSummary> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.accessRequestStatus;
}

export async function getPlatformUsageActivity(
    filters: SystemAnalyticsFilters = {},
): Promise<PlatformUsageActivity[]> {
    const analytics = await getSystemAnalytics(filters);

    return analytics.platformUsageActivity;
}

export async function getSystemAnalytics(
    filters: SystemAnalyticsFilters = {},
): Promise<SystemAnalyticsPayload> {
    const query = params(filters);
    const response = await fetchApi<SystemAnalyticsPayload>(
        `/api/admin/analytics/overview${query ? `?${query}` : ''}`,
    );

    return response.data;
}

export async function getSystemAnalyticsFilterOptions(): Promise<SystemAnalyticsFilterOptions> {
    const analytics = await getSystemAnalytics();

    return analytics.filterOptions;
}

export async function exportSystemAnalyticsReport(
    options: AnalyticsExportOptions,
): Promise<AnalyticsExportResult> {
    const response = await fetch('/api/admin/reports/research/export', {
        credentials: 'same-origin',
        headers: { Accept: 'text/csv', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!response.ok) {
        throw new Error('Unable to export analytics report.');
    }

    return {
        id: `system-analytics-export-${Date.now()}`,
        fileName: `rikms-system-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
        format: options.format,
        generatedAt: new Date().toISOString(),
        status: 'ready',
    };
}
