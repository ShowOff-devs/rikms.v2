import {
    categoryColors,
    sdgColors,
    systemAnalyticsRecords,
} from '@/data/mock-system-analytics';
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
    SystemResearchAnalyticsRecord,
} from '@/types/system-analytics';

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

const monthWeights = [
    { month: 'Oct', views: 0.13, downloads: 0.13, accessRequests: 0.12 },
    { month: 'Nov', views: 0.14, downloads: 0.15, accessRequests: 0.15 },
    { month: 'Dec', views: 0.12, downloads: 0.11, accessRequests: 0.12 },
    { month: 'Jan', views: 0.16, downloads: 0.16, accessRequests: 0.17 },
    { month: 'Feb', views: 0.18, downloads: 0.18, accessRequests: 0.2 },
    { month: 'Mar', views: 0.15, downloads: 0.14, accessRequests: 0.14 },
];

function uniqueSorted(values: string[]) {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function isFilterActive(value?: string) {
    return Boolean(value && value !== 'all');
}

function getAccessRequestTotal(record: SystemResearchAnalyticsRecord) {
    return (
        record.accessRequests.approved +
        record.accessRequests.pending +
        record.accessRequests.denied
    );
}

function filterRecords(filters: SystemAnalyticsFilters = {}) {
    return systemAnalyticsRecords.filter((record) => {
        if (
            isFilterActive(filters.agency) &&
            record.agency !== filters.agency
        ) {
            return false;
        }

        if (
            isFilterActive(filters.publicationYear) &&
            String(record.year) !== filters.publicationYear
        ) {
            return false;
        }

        if (
            isFilterActive(filters.researchCategory) &&
            record.category !== filters.researchCategory
        ) {
            return false;
        }

        if (isFilterActive(filters.sdg) && record.sdg !== filters.sdg) {
            return false;
        }

        if (
            isFilterActive(filters.documentType) &&
            record.documentType !== filters.documentType
        ) {
            return false;
        }

        if (
            isFilterActive(filters.accessType) &&
            record.accessType !== filters.accessType
        ) {
            return false;
        }

        if (
            isFilterActive(filters.status) &&
            record.status !== filters.status
        ) {
            return false;
        }

        return true;
    });
}

function getFilterOptions(): SystemAnalyticsFilterOptions {
    return {
        agencies: uniqueSorted(
            systemAnalyticsRecords.map((record) => record.agency),
        ),
        publicationYears: Array.from(
            new Set(
                systemAnalyticsRecords.map((record) => String(record.year)),
            ),
        ).sort((a, b) => Number(b) - Number(a)),
        researchCategories: uniqueSorted(
            systemAnalyticsRecords.map((record) => record.category),
        ),
        sdgs: Array.from(
            new Map(
                systemAnalyticsRecords.map((record) => [
                    record.sdg,
                    {
                        value: record.sdg,
                        label: `${record.sdg} - ${record.sdgLabel}`,
                    },
                ]),
            ).values(),
        ).sort((a, b) => {
            const left = Number(a.value.replace('SDG ', ''));
            const right = Number(b.value.replace('SDG ', ''));

            return left - right;
        }),
        documentTypes: uniqueSorted(
            systemAnalyticsRecords.map((record) => record.documentType),
        ),
        accessTypes: uniqueSorted(
            systemAnalyticsRecords.map((record) => record.accessType),
        ),
        statuses: ['approved', 'pending', 'denied'],
    };
}

export async function getSystemAnalyticsMetrics(
    filters: SystemAnalyticsFilters = {},
): Promise<SystemAnalyticsMetric[]> {
    await mockNetworkDelay();

    const records = filterRecords(filters);
    const agencyAdmins = new Map<string, number>();

    records.forEach((record) => {
        agencyAdmins.set(
            record.agency,
            Math.max(
                agencyAdmins.get(record.agency) ?? 0,
                record.activeAgencyAdmins,
            ),
        );
    });

    return [
        {
            id: 'total-records',
            label: 'Total Research Records',
            value: records.length,
            icon: 'database',
        },
        {
            id: 'participating-agencies',
            label: 'Total Participating Agencies',
            value: new Set(records.map((record) => record.agency)).size,
            icon: 'building',
        },
        {
            id: 'downloads',
            label: 'Total Downloads',
            value: records.reduce((sum, record) => sum + record.downloads, 0),
            icon: 'download',
        },
        {
            id: 'views',
            label: 'Total Views',
            value: records.reduce((sum, record) => sum + record.views, 0),
            icon: 'eye',
        },
        {
            id: 'access-requests',
            label: 'Total Access Requests',
            value: records.reduce(
                (sum, record) => sum + getAccessRequestTotal(record),
                0,
            ),
            icon: 'file',
        },
        {
            id: 'agency-admins',
            label: 'Active Agency Admin Users',
            value: Array.from(agencyAdmins.values()).reduce(
                (sum, count) => sum + count,
                0,
            ),
            icon: 'users',
        },
    ];
}

export async function getResearchUploadTrends(
    filters: SystemAnalyticsFilters = {},
): Promise<ResearchUploadTrend[]> {
    await mockNetworkDelay();

    const grouped = new Map<number, number>();

    filterRecords(filters).forEach((record) => {
        grouped.set(record.year, (grouped.get(record.year) ?? 0) + 1);
    });

    return Array.from(grouped.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);
}

export async function getResearchByAgency(
    filters: SystemAnalyticsFilters = {},
): Promise<ResearchByAgency[]> {
    await mockNetworkDelay();

    const grouped = new Map<string, number>();

    filterRecords(filters).forEach((record) => {
        grouped.set(record.agency, (grouped.get(record.agency) ?? 0) + 1);
    });

    return Array.from(grouped.entries())
        .map(([agency, count]) => ({ agency, count }))
        .sort((a, b) => b.count - a.count);
}

export async function getResearchByCategory(
    filters: SystemAnalyticsFilters = {},
): Promise<ResearchByCategory[]> {
    await mockNetworkDelay();

    const grouped = new Map<string, number>();

    filterRecords(filters).forEach((record) => {
        grouped.set(record.category, (grouped.get(record.category) ?? 0) + 1);
    });

    return Array.from(grouped.entries())
        .map(([category, count]) => ({
            category,
            count,
            color: categoryColors[category] ?? '#6b7280',
        }))
        .sort((a, b) => b.count - a.count);
}

export async function getSDGContribution(
    filters: SystemAnalyticsFilters = {},
): Promise<SDGContribution[]> {
    await mockNetworkDelay();

    const grouped = new Map<string, { label: string; count: number }>();

    filterRecords(filters).forEach((record) => {
        const current = grouped.get(record.sdg) ?? {
            label: record.sdgLabel,
            count: 0,
        };

        grouped.set(record.sdg, {
            label: current.label,
            count: current.count + 1,
        });
    });

    const max = Math.max(
        ...Array.from(grouped.values()).map((item) => item.count),
        0,
    );

    return Array.from(grouped.entries())
        .map(([sdg, item]) => {
            const sdgNumber = Number(sdg.replace('SDG ', ''));

            return {
                sdg,
                label: item.label,
                count: item.count,
                percentage:
                    max === 0 ? 0 : Math.round((item.count / max) * 100),
                color: sdgColors[(sdgNumber - 1) % sdgColors.length],
            };
        })
        .sort(
            (a, b) =>
                Number(a.sdg.replace('SDG ', '')) -
                Number(b.sdg.replace('SDG ', '')),
        );
}

export async function getMostAccessedResearch(
    filters: SystemAnalyticsFilters = {},
): Promise<MostAccessedResearch[]> {
    await mockNetworkDelay();

    return filterRecords(filters)
        .map((record) => ({
            id: record.id,
            title: record.title,
            agency: record.agency,
            year: record.year,
            views: record.views,
            downloads: record.downloads,
        }))
        .sort((a, b) => b.downloads + b.views - (a.downloads + a.views))
        .slice(0, 10);
}

export async function getAccessRequestStatusSummary(
    filters: SystemAnalyticsFilters = {},
): Promise<AccessRequestStatusSummary> {
    await mockNetworkDelay();

    return filterRecords(filters).reduce<AccessRequestStatusSummary>(
        (summary, record) => ({
            approved: summary.approved + record.accessRequests.approved,
            pending: summary.pending + record.accessRequests.pending,
            denied: summary.denied + record.accessRequests.denied,
        }),
        { approved: 0, pending: 0, denied: 0 },
    );
}

export async function getPlatformUsageActivity(
    filters: SystemAnalyticsFilters = {},
): Promise<PlatformUsageActivity[]> {
    await mockNetworkDelay();

    const records = filterRecords(filters);
    const totalViews = records.reduce((sum, record) => sum + record.views, 0);
    const totalDownloads = records.reduce(
        (sum, record) => sum + record.downloads,
        0,
    );
    const totalRequests = records.reduce(
        (sum, record) => sum + getAccessRequestTotal(record),
        0,
    );

    if (records.length === 0) {
        return [];
    }

    return monthWeights.map((item) => ({
        month: item.month,
        repositoryViews: Math.round(totalViews * item.views),
        downloads: Math.round(totalDownloads * item.downloads),
        accessRequests: Math.round(totalRequests * item.accessRequests),
    }));
}

export async function getSystemAnalytics(
    filters: SystemAnalyticsFilters = {},
): Promise<SystemAnalyticsPayload> {
    const [
        metrics,
        uploadTrends,
        researchByAgency,
        researchByCategory,
        sdgContribution,
        mostAccessedResearch,
        accessRequestStatus,
        platformUsageActivity,
    ] = await Promise.all([
        getSystemAnalyticsMetrics(filters),
        getResearchUploadTrends(filters),
        getResearchByAgency(filters),
        getResearchByCategory(filters),
        getSDGContribution(filters),
        getMostAccessedResearch(filters),
        getAccessRequestStatusSummary(filters),
        getPlatformUsageActivity(filters),
    ]);

    return {
        metrics,
        uploadTrends,
        researchByAgency,
        researchByCategory,
        sdgContribution,
        mostAccessedResearch,
        accessRequestStatus,
        platformUsageActivity,
        filterOptions: getFilterOptions(),
    };
}

export async function exportSystemAnalyticsReport(
    options: AnalyticsExportOptions,
): Promise<AnalyticsExportResult> {
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const dateStamp = generatedAt.slice(0, 10);

    return {
        id: `system-analytics-export-${Date.now()}`,
        fileName: `rikms-system-analytics-${dateStamp}.${options.format}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}
