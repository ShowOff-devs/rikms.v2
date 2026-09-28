import { fetchApi } from '@/lib/api-client';
import { downloadResponseFile } from '@/lib/download-file';
import type {
    ProjectReportAgencyComparison,
    ProjectReportAnalyticsFilters,
    ProjectReportAnalyticsDetail,
    ProjectReportAnalyticsOverview,
    ProjectReportBudgetAnalytics,
    ProjectReportRecordsResponse,
    ProjectReportStatusAnalytics,
    ProjectReportSummary,
} from '@/types/project-report-analytics';

const allValue = 'all';
const persistedFilterKeys: (keyof ProjectReportAnalyticsFilters)[] = [
    'agency_id',
    'report_type',
    'publication_year',
    'reporting_period',
    'workflow_status',
    'completeness',
    'budget_classification',
    'accomplishment_classification',
    'funding_source',
    'date_from',
    'date_to',
];

type RecordsOptions = {
    page?: number;
    perPage?: number;
};

function paramsFromFilters(
    filters: ProjectReportAnalyticsFilters,
    records?: RecordsOptions,
) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== allValue) {
            params.set(key, value);
        }
    });

    if (records?.page) {
        params.set('page', String(records.page));
    }

    if (records?.perPage) {
        params.set('per_page', String(records.perPage));
    }

    return params;
}

export function projectReportStateFromSearch(search: string) {
    const params = new URLSearchParams(search);
    const filters: ProjectReportAnalyticsFilters = {};

    persistedFilterKeys.forEach((key) => {
        const value = params.get(key);

        if (value) {
            Object.assign(filters, { [key]: value });
        }
    });

    const requestedPage = Number(params.get('page'));

    return {
        filters,
        page:
            Number.isInteger(requestedPage) && requestedPage > 0
                ? requestedPage
                : 1,
    };
}

export function projectReportAnalyticsPath(
    analyticsPath: '/admin/analytics' | '/agency/analytics',
    filters: ProjectReportAnalyticsFilters,
    page: number,
) {
    const params = paramsFromFilters(filters);
    params.set('view', 'project-reports');

    if (page > 1) {
        params.set('page', String(page));
    }

    return `${analyticsPath}?${params.toString()}`;
}

export function projectReportDetailPath(
    detailPath: string,
    returnPath: string,
) {
    const params = new URLSearchParams({ return_to: returnPath });

    return `${detailPath}?${params.toString()}`;
}

export function projectReportReturnPath(
    analyticsPath: '/admin/analytics' | '/agency/analytics',
) {
    const fallback = `${analyticsPath}?view=project-reports`;

    if (typeof window === 'undefined') {
        return fallback;
    }

    const requested = new URLSearchParams(window.location.search).get(
        'return_to',
    );

    if (!requested) {
        return fallback;
    }

    const url = new URL(requested, window.location.origin);

    return url.origin === window.location.origin &&
        url.pathname === analyticsPath
        ? `${url.pathname}${url.search}`
        : fallback;
}

function projectReportUrl(
    segment: 'overview' | 'summary' | 'status' | 'budget' | 'records',
    filters: ProjectReportAnalyticsFilters,
    records?: RecordsOptions,
) {
    const params = paramsFromFilters(filters, records);
    const query = params.toString();

    return `/api/agency/analytics/project-reports/${segment}${query ? `?${query}` : ''}`;
}

function adminProjectReportUrl(
    segment:
        | 'overview'
        | 'summary'
        | 'status'
        | 'budget'
        | 'agencies'
        | 'records',
    filters: ProjectReportAnalyticsFilters,
    records?: RecordsOptions,
) {
    const params = paramsFromFilters(filters, records);
    const query = params.toString();

    return `/api/admin/analytics/project-reports/${segment}${query ? `?${query}` : ''}`;
}

export async function getProjectReportDetail(
    researchId: string | number,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportAnalyticsDetail>(
        `/api/agency/analytics/project-reports/${researchId}`,
        { signal },
    );

    return data;
}

export async function getAdminProjectReportDetail(
    researchId: string | number,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportAnalyticsDetail>(
        `/api/admin/analytics/project-reports/${researchId}`,
        { signal },
    );

    return data;
}

export async function getProjectReportSummary(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportSummary>(
        projectReportUrl('summary', filters),
        { signal },
    );

    return data;
}

export async function getProjectReportOverview(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportAnalyticsOverview>(
        projectReportUrl('overview', filters),
        { signal },
    );

    return data;
}

export async function getAdminProjectReportSummary(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportSummary>(
        adminProjectReportUrl('summary', filters),
        { signal },
    );

    return data;
}

export async function getAdminProjectReportOverview(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportAnalyticsOverview>(
        adminProjectReportUrl('overview', filters),
        { signal },
    );

    return data;
}

export async function getProjectReportStatusAnalytics(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportStatusAnalytics>(
        projectReportUrl('status', filters),
        { signal },
    );

    return data;
}

export async function getAdminProjectReportStatusAnalytics(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportStatusAnalytics>(
        adminProjectReportUrl('status', filters),
        { signal },
    );

    return data;
}

export async function getProjectReportBudgetAnalytics(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportBudgetAnalytics>(
        projectReportUrl('budget', filters),
        { signal },
    );

    return data;
}

export async function getAdminProjectReportBudgetAnalytics(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportBudgetAnalytics>(
        adminProjectReportUrl('budget', filters),
        { signal },
    );

    return data;
}

export async function getAdminProjectReportAgencies(
    filters: ProjectReportAnalyticsFilters,
    signal?: AbortSignal,
) {
    const { data } = await fetchApi<ProjectReportAgencyComparison[]>(
        adminProjectReportUrl('agencies', filters),
        { signal },
    );

    return data;
}

export async function getProjectReportRecords(
    filters: ProjectReportAnalyticsFilters,
    options: RecordsOptions,
    signal?: AbortSignal,
): Promise<ProjectReportRecordsResponse> {
    const { data, meta } = await fetchApi<
        ProjectReportRecordsResponse['data'],
        { pagination: ProjectReportRecordsResponse['pagination'] }
    >(projectReportUrl('records', filters, options), { signal });

    return {
        data,
        pagination: meta.pagination,
    };
}

export async function getAdminProjectReportRecords(
    filters: ProjectReportAnalyticsFilters,
    options: RecordsOptions,
    signal?: AbortSignal,
): Promise<ProjectReportRecordsResponse> {
    const { data, meta } = await fetchApi<
        ProjectReportRecordsResponse['data'],
        { pagination: ProjectReportRecordsResponse['pagination'] }
    >(adminProjectReportUrl('records', filters, options), { signal });

    return {
        data,
        pagination: meta.pagination,
    };
}

export async function exportAdminProjectReportAnalytics(
    filters: ProjectReportAnalyticsFilters,
    format: 'pdf' | 'csv',
) {
    const params = paramsFromFilters(filters);
    params.set('format', format);
    const response = await fetch(
        `/api/admin/analytics/project-reports/export?${params.toString()}`,
        {
            credentials: 'same-origin',
            headers: {
                Accept: format === 'pdf' ? 'application/pdf' : 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) {
        throw new Error('Unable to export project report analytics.');
    }

    return downloadResponseFile(
        response,
        `project-report-analytics-${new Date().toISOString().slice(0, 10)}.${format}`,
    );
}

export async function exportAgencyProjectReportAnalytics(
    filters: ProjectReportAnalyticsFilters,
    format: 'pdf' | 'csv',
) {
    const params = paramsFromFilters(filters);
    params.set('format', format);
    const response = await fetch(
        `/api/agency/analytics/project-reports/export?${params.toString()}`,
        {
            credentials: 'same-origin',
            headers: {
                Accept: format === 'pdf' ? 'application/pdf' : 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) {
        throw new Error('Unable to export agency project report analytics.');
    }

    return downloadResponseFile(
        response,
        `agency-project-report-analytics-${new Date().toISOString().slice(0, 10)}.${format}`,
    );
}

export async function getProjectReportAnalytics(
    filters: ProjectReportAnalyticsFilters,
    records: RecordsOptions,
    signal?: AbortSignal,
) {
    const [overview, reportRecords] = await Promise.all([
        getProjectReportOverview(filters, signal),
        getProjectReportRecords(filters, records, signal),
    ]);

    return {
        summary: overview.summary,
        status: overview.status,
        budget: overview.budget,
        records: reportRecords.data,
        pagination: reportRecords.pagination,
    };
}

export async function getAdminProjectReportAnalytics(
    filters: ProjectReportAnalyticsFilters,
    records: RecordsOptions,
    signal?: AbortSignal,
) {
    const [overview, reportRecords] = await Promise.all([
        getAdminProjectReportOverview(filters, signal),
        getAdminProjectReportRecords(filters, records, signal),
    ]);

    return {
        summary: overview.summary,
        status: overview.status,
        budget: overview.budget,
        agencies: overview.agencies,
        records: reportRecords.data,
        pagination: reportRecords.pagination,
    };
}
