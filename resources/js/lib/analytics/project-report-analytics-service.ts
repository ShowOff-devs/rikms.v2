import { fetchApi } from '@/lib/api-client';
import { downloadResponseFile } from '@/lib/download-file';
import type {
    ProjectReportAgencyComparison,
    ProjectReportAnalyticsFilters,
    ProjectReportAnalyticsDetail,
    ProjectReportBudgetAnalytics,
    ProjectReportRecordsResponse,
    ProjectReportStatusAnalytics,
    ProjectReportSummary,
} from '@/types/project-report-analytics';

const allValue = 'all';

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

function projectReportUrl(
    segment: 'summary' | 'status' | 'budget' | 'records',
    filters: ProjectReportAnalyticsFilters,
    records?: RecordsOptions,
) {
    const params = paramsFromFilters(filters, records);
    const query = params.toString();

    return `/api/agency/analytics/project-reports/${segment}${query ? `?${query}` : ''}`;
}

function adminProjectReportUrl(
    segment: 'summary' | 'status' | 'budget' | 'agencies' | 'records',
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

export async function getProjectReportAnalytics(
    filters: ProjectReportAnalyticsFilters,
    records: RecordsOptions,
    signal?: AbortSignal,
) {
    const [summary, status, budget, reportRecords] = await Promise.all([
        getProjectReportSummary(filters, signal),
        getProjectReportStatusAnalytics(filters, signal),
        getProjectReportBudgetAnalytics(filters, signal),
        getProjectReportRecords(filters, records, signal),
    ]);

    return {
        summary,
        status,
        budget,
        records: reportRecords.data,
        pagination: reportRecords.pagination,
    };
}

export async function getAdminProjectReportAnalytics(
    filters: ProjectReportAnalyticsFilters,
    records: RecordsOptions,
    signal?: AbortSignal,
) {
    const [summary, status, budget, agencies, reportRecords] =
        await Promise.all([
            getAdminProjectReportSummary(filters, signal),
            getAdminProjectReportStatusAnalytics(filters, signal),
            getAdminProjectReportBudgetAnalytics(filters, signal),
            getAdminProjectReportAgencies(filters, signal),
            getAdminProjectReportRecords(filters, records, signal),
        ]);

    return {
        summary,
        status,
        budget,
        agencies,
        records: reportRecords.data,
        pagination: reportRecords.pagination,
    };
}
