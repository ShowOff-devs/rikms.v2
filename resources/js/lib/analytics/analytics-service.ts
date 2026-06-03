import { fetchApi } from '@/lib/api-client';
import type {
    AccessRequestBreakdown,
    AgencyAnalyticsPayload,
    AnalyticsExportResult,
    AnalyticsFilters,
    AnalyticsFilterOptions,
    MostAccessedResearch,
} from '@/types/analytics';

const allValue = 'all';

function paramsFromFilters(filters: AnalyticsFilters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== allValue) {
            params.set(key, value);
        }
    });

    return params;
}

function analyticsUrl(filters: AnalyticsFilters = {}) {
    const params = paramsFromFilters(filters);
    const query = params.toString();

    return `/api/agency/analytics${query ? `?${query}` : ''}`;
}

export function filterAnalyticsRecords(
    records: AgencyAnalyticsPayload['records'],
    filters: AnalyticsFilters,
) {
    void filters;

    return records;
}

export function getAnalyticsFilterOptions(): AnalyticsFilterOptions {
    return {
        years: [],
        documentTypes: [],
        categories: [],
        sdgs: [],
        statuses: ['approved', 'pending', 'denied'],
        accessTypes: [],
    };
}

export async function getAgencyAnalytics(filters: AnalyticsFilters = {}) {
    const { data } = await fetchApi<AgencyAnalyticsPayload>(
        analyticsUrl(filters),
    );

    return data;
}

export async function getSummaryMetrics(filters: AnalyticsFilters = {}) {
    return (await getAgencyAnalytics(filters)).summaryMetrics;
}

export async function getYearlyPublications(filters: AnalyticsFilters = {}) {
    return (await getAgencyAnalytics(filters)).yearlyPublications;
}

export async function getCategoryDistribution(filters: AnalyticsFilters = {}) {
    return (await getAgencyAnalytics(filters)).categoryDistribution;
}

export async function getSDGContributions(filters: AnalyticsFilters = {}) {
    return (await getAgencyAnalytics(filters)).sdgContributions;
}

export async function getMostAccessedResearch(
    filters: AnalyticsFilters = {},
): Promise<MostAccessedResearch[]> {
    return (await getAgencyAnalytics(filters)).mostAccessedResearch;
}

export async function getAccessRequestBreakdown(
    filters: AnalyticsFilters = {},
): Promise<AccessRequestBreakdown> {
    return (await getAgencyAnalytics(filters)).accessRequestBreakdown;
}

export async function getDownloadTrends(filters: AnalyticsFilters = {}) {
    return (await getAgencyAnalytics(filters)).downloadTrends;
}

export async function exportAgencyAnalyticsReport(
    filters: AnalyticsFilters = {},
): Promise<AnalyticsExportResult> {
    const params = paramsFromFilters(filters);
    const query = params.toString();
    const url = `/api/agency/analytics/export${query ? `?${query}` : ''}`;
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'text/csv',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Unable to export agency analytics report.');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const fileName =
        response.headers
            .get('content-disposition')
            ?.match(/filename="?([^"]+)"?/i)?.[1] ??
        `agency-research-analytics-${filters.year ?? 'all-years'}.csv`;
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(downloadUrl);

    return {
        success: true,
        fileName,
        generatedAt: new Date().toISOString(),
        filters,
    };
}
