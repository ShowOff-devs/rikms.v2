import {
    agencyAnalyticsRecords,
    analyticsCategories,
    analyticsMonths,
    sdgLabels,
} from '@/data/mock-analytics';
import type {
    AccessRequestBreakdown,
    AgencyAnalyticsPayload,
    AnalyticsExportResult,
    AnalyticsFilters,
    AnalyticsFilterOptions,
    AnalyticsResearchRecord,
    CategoryDistribution,
    DownloadTrend,
    MostAccessedResearch,
    SDGContribution,
    SummaryMetric,
    TrendDirection,
    YearlyPublication,
} from '@/types/analytics';

const mockNetworkDelay = (duration = 220) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

const allValue = 'all';

function isActive(value?: string) {
    return Boolean(value && value !== allValue);
}

function formatSdgValue(sdg: number) {
    return `SDG ${sdg}`;
}

function parseSdg(value?: string) {
    if (!isActive(value)) {
        return null;
    }

    const match = value?.match(/\d+/);

    return match ? Number(match[0]) : null;
}

export function filterAnalyticsRecords(
    records: AnalyticsResearchRecord[],
    filters: AnalyticsFilters,
) {
    const selectedSdg = parseSdg(filters.sdg);

    return records.filter((record) => {
        const matchesYear =
            !isActive(filters.year) || String(record.year) === filters.year;
        const matchesDocumentType =
            !isActive(filters.documentType) ||
            record.documentType === filters.documentType;
        const matchesCategory =
            !isActive(filters.category) || record.category === filters.category;
        const matchesSdg =
            selectedSdg === null || record.sdgs.includes(selectedSdg);
        const matchesStatus =
            !isActive(filters.status) || record.status === filters.status;
        const matchesAccessType =
            !isActive(filters.accessType) ||
            record.accessType === filters.accessType;

        return (
            matchesYear &&
            matchesDocumentType &&
            matchesCategory &&
            matchesSdg &&
            matchesStatus &&
            matchesAccessType
        );
    });
}

export function getAnalyticsFilterOptions(): AnalyticsFilterOptions {
    const years = Array.from(
        new Set(agencyAnalyticsRecords.map((record) => String(record.year))),
    ).sort((first, second) => Number(second) - Number(first));

    return {
        years,
        documentTypes: uniqueSorted(
            agencyAnalyticsRecords.map((record) => record.documentType),
        ),
        categories: analyticsCategories.map((item) => item.category),
        sdgs: sdgLabels.map((_, index) => formatSdgValue(index + 1)),
        statuses: ['approved', 'pending', 'denied'],
        accessTypes: uniqueSorted(
            agencyAnalyticsRecords.map((record) => record.accessType),
        ),
    };
}

export async function getAgencyAnalytics(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay();

    return buildAgencyAnalytics(filters);
}

export async function getSummaryMetrics(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay(120);

    return buildSummaryMetrics(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
        filters,
    );
}

export async function getYearlyPublications(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay(120);

    return buildYearlyPublications(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
    );
}

export async function getCategoryDistribution(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay(120);

    return buildCategoryDistribution(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
    );
}

export async function getSDGContributions(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay(120);

    return buildSdgContributions(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
    );
}

export async function getMostAccessedResearch(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay(120);

    return buildMostAccessedResearch(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
    );
}

export async function getAccessRequestBreakdown(
    filters: AnalyticsFilters = {},
) {
    await mockNetworkDelay(120);

    return buildAccessRequestBreakdown(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
    );
}

export async function getDownloadTrends(filters: AnalyticsFilters = {}) {
    await mockNetworkDelay(120);

    return buildDownloadTrends(
        filterAnalyticsRecords(agencyAnalyticsRecords, filters),
    );
}

export async function exportAgencyAnalyticsReport(
    filters: AnalyticsFilters = {},
): Promise<AnalyticsExportResult> {
    await mockNetworkDelay(420);

    const year = isActive(filters.year) ? filters.year : 'all-years';

    return {
        success: true,
        fileName: `agency-research-analytics-${year}.csv`,
        generatedAt: new Date().toISOString(),
        filters,
    };
}

function buildAgencyAnalytics(
    filters: AnalyticsFilters,
): AgencyAnalyticsPayload {
    const records = filterAnalyticsRecords(agencyAnalyticsRecords, filters);

    return {
        filters,
        summaryMetrics: buildSummaryMetrics(records, filters),
        yearlyPublications: buildYearlyPublications(records),
        categoryDistribution: buildCategoryDistribution(records),
        sdgContributions: buildSdgContributions(records),
        mostAccessedResearch: buildMostAccessedResearch(records),
        accessRequestBreakdown: buildAccessRequestBreakdown(records),
        downloadTrends: buildDownloadTrends(records),
        records,
        filterOptions: getAnalyticsFilterOptions(),
    };
}

function buildSummaryMetrics(
    records: AnalyticsResearchRecord[],
    filters: AnalyticsFilters,
): SummaryMetric[] {
    const currentYear = getComparisonYear(filters);
    const previousYear = currentYear - 1;
    const previousRecords = filterAnalyticsRecords(agencyAnalyticsRecords, {
        ...filters,
        year: String(previousYear),
    });

    return [
        {
            id: 'total-research',
            label: 'Total Research',
            value: records.length,
            ...buildTrend(records.length, previousRecords.length),
        },
        {
            id: 'total-downloads',
            label: 'Total Downloads',
            value: sum(records, 'downloads'),
            ...buildTrend(
                sum(records, 'downloads'),
                sum(previousRecords, 'downloads'),
            ),
        },
        {
            id: 'total-views',
            label: 'Total Views',
            value: sum(records, 'views'),
            ...buildTrend(sum(records, 'views'), sum(previousRecords, 'views')),
        },
        {
            id: 'access-requests',
            label: 'Access Requests',
            value: sum(records, 'accessRequests'),
            ...buildTrend(
                sum(records, 'accessRequests'),
                sum(previousRecords, 'accessRequests'),
            ),
        },
    ];
}

function buildYearlyPublications(
    records: AnalyticsResearchRecord[],
): YearlyPublication[] {
    const years = getAnalyticsFilterOptions().years.map(Number).reverse();

    return years
        .map((year) => ({
            year,
            count: records.filter((record) => record.year === year).length,
        }))
        .filter((item) => item.count > 0);
}

function buildCategoryDistribution(
    records: AnalyticsResearchRecord[],
): CategoryDistribution[] {
    return analyticsCategories
        .map((category) => ({
            ...category,
            count: records.filter(
                (record) => record.category === category.category,
            ).length,
        }))
        .filter((item) => item.count > 0);
}

function buildSdgContributions(
    records: AnalyticsResearchRecord[],
): SDGContribution[] {
    const total = records.length || 1;

    return sdgLabels
        .map((label, index) => {
            const sdg = index + 1;
            const count = records.filter((record) =>
                record.sdgs.includes(sdg),
            ).length;

            return {
                sdg: formatSdgValue(sdg),
                label,
                count,
                percentage: Math.round((count / total) * 100),
            };
        })
        .filter((item) => item.count > 0)
        .sort((first, second) => second.count - first.count);
}

function buildMostAccessedResearch(
    records: AnalyticsResearchRecord[],
): MostAccessedResearch[] {
    return [...records]
        .sort(
            (first, second) =>
                second.downloads +
                second.views -
                (first.downloads + first.views),
        )
        .slice(0, 8)
        .map(({ id, title, category, year, downloads, views }) => ({
            id,
            title,
            category,
            year,
            downloads,
            views,
        }));
}

function buildAccessRequestBreakdown(
    records: AnalyticsResearchRecord[],
): AccessRequestBreakdown {
    return records.reduce(
        (breakdown, record) => ({
            ...breakdown,
            [record.status]: breakdown[record.status] + record.accessRequests,
        }),
        { approved: 0, pending: 0, denied: 0 },
    );
}

function buildDownloadTrends(
    records: AnalyticsResearchRecord[],
): DownloadTrend[] {
    return analyticsMonths.map((month, index) => ({
        month,
        downloads: records.reduce(
            (total, record) => total + record.monthlyDownloads[index],
            0,
        ),
    }));
}

function buildTrend(current: number, previous: number) {
    if (previous === 0 && current === 0) {
        return { trend: 0, trendDirection: 'neutral' as TrendDirection };
    }

    if (previous === 0) {
        return { trend: 100, trendDirection: 'up' as TrendDirection };
    }

    const trend = Math.round(((current - previous) / previous) * 100);
    const trendDirection: TrendDirection =
        trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';

    return { trend: Math.abs(trend), trendDirection };
}

function getComparisonYear(filters: AnalyticsFilters) {
    if (isActive(filters.year)) {
        return Number(filters.year);
    }

    return Math.max(...agencyAnalyticsRecords.map((record) => record.year));
}

function sum(
    records: AnalyticsResearchRecord[],
    field: 'downloads' | 'views' | 'accessRequests',
) {
    return records.reduce((total, record) => total + record[field], 0);
}

function uniqueSorted(values: string[]) {
    return Array.from(new Set(values)).sort((first, second) =>
        first.localeCompare(second),
    );
}
