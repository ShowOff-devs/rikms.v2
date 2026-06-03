import { fetchApi } from '@/lib/api-client';
import type {
    SystemResearchExportOptions,
    SystemResearchExportResult,
    SystemResearchFilters,
    SystemResearchRecord,
    SystemResearchSummary,
} from '@/types/system-research';

type AdminResearchApiRecord = {
    id: number;
    title: string;
    authors: string[] | string;
    agency_id: number;
    agency?: {
        name?: string | null;
        short_name?: string | null;
    };
    publication_year?: number | null;
    status: string;
    category?: string | null;
    sdgs?: string[];
    abstract?: string | null;
    access_level?: string | null;
    downloads: number;
    created_at?: string | null;
    published_at?: string | null;
};

function isFilterActive(value?: string) {
    return Boolean(value && value !== 'all');
}

function getSearchText(record: SystemResearchRecord) {
    return [
        record.title,
        record.authors.join(' '),
        record.agencyName,
        record.agencyShortName,
        record.category,
        record.sdgs.join(' '),
        record.status,
        record.year,
        record.documentType,
        record.accessType,
    ]
        .join(' ')
        .toLowerCase();
}

export function filterSystemResearchRecords(
    records: SystemResearchRecord[],
    filters: SystemResearchFilters = {},
) {
    const query = filters.search?.trim().toLowerCase();

    return records.filter((record) => {
        if (query && !getSearchText(record).includes(query)) {
            return false;
        }

        if (
            isFilterActive(filters.agency) &&
            record.agencyShortName !== filters.agency
        ) {
            return false;
        }

        if (
            isFilterActive(filters.status) &&
            record.status !== filters.status
        ) {
            return false;
        }

        if (
            isFilterActive(filters.year) &&
            String(record.year) !== filters.year
        ) {
            return false;
        }

        if (
            isFilterActive(filters.category) &&
            record.category !== filters.category
        ) {
            return false;
        }

        if (
            isFilterActive(filters.sdg) &&
            !record.sdgs.includes(filters.sdg as string)
        ) {
            return false;
        }

        if (
            isFilterActive(filters.documentType) &&
            record.documentType !== filters.documentType
        ) {
            return false;
        }

        return true;
    });
}

export function createSystemResearchSummary(
    records: SystemResearchRecord[],
): SystemResearchSummary {
    return {
        totalRecords: records.length,
        published: records.filter((record) => record.status === 'published')
            .length,
        underReview: records.filter(
            (record) => record.status === 'under-review',
        ).length,
        totalViews: records.reduce((total, record) => total + record.views, 0),
    };
}

export async function getSystemResearchRecords(
    filters: SystemResearchFilters = {},
): Promise<SystemResearchRecord[]> {
    const { data } = await fetchApi<AdminResearchApiRecord[]>(
        '/api/admin/research?per_page=100',
    );

    return filterSystemResearchRecords(data.map(mapResearchFromApi), filters);
}

export async function getSystemResearchSummary(
    filters: SystemResearchFilters = {},
): Promise<SystemResearchSummary> {
    const records = await getSystemResearchRecords(filters);

    return createSystemResearchSummary(records);
}

export async function getSystemResearchRecordById(
    id: string,
): Promise<SystemResearchRecord | null> {
    const { data } = await fetchApi<AdminResearchApiRecord>(
        `/api/admin/research/${id}`,
    );

    return mapResearchFromApi(data);
}

export async function exportSystemResearchRecords(
    options: SystemResearchExportOptions,
): Promise<SystemResearchExportResult> {
    const response = await fetch('/api/admin/reports/research/export', {
        credentials: 'same-origin',
        headers: { Accept: 'text/csv', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!response.ok) {
        throw new Error('Unable to export system research records.');
    }

    const generatedAt = new Date().toISOString();
    const dateStamp = generatedAt.slice(0, 10);

    return {
        id: `system-research-export-${Date.now()}`,
        fileName: `rikms-system-research-records-${dateStamp}.${options.format}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}

function mapResearchFromApi(
    record: AdminResearchApiRecord,
): SystemResearchRecord {
    const authors = Array.isArray(record.authors)
        ? record.authors
        : record.authors
              .split(',')
              .map((author) => author.trim())
              .filter(Boolean);

    return {
        id: String(record.id),
        title: record.title,
        authors,
        agencyId: String(record.agency_id),
        agencyName: record.agency?.name ?? 'Unknown agency',
        agencyShortName:
            record.agency?.short_name ?? record.agency?.name ?? 'Unknown',
        year: record.publication_year ?? new Date().getFullYear(),
        status: mapResearchStatus(record.status),
        category: record.category ?? 'Uncategorized',
        sdgs: record.sdgs ?? [],
        abstract: record.abstract ?? undefined,
        documentType: 'research-study',
        accessType: mapAccessType(record.access_level),
        downloads: record.downloads,
        views: record.downloads,
        uploadedAt: record.created_at ?? new Date().toISOString(),
        publishedAt: record.published_at ?? undefined,
    };
}

function mapResearchStatus(status: string): SystemResearchRecord['status'] {
    if (status === 'published' || status === 'draft' || status === 'archived') {
        return status;
    }

    return 'under-review';
}

function mapAccessType(
    accessLevel?: string | null,
): SystemResearchRecord['accessType'] {
    if (
        accessLevel === 'public' ||
        accessLevel === 'restricted' ||
        accessLevel === 'embargo'
    ) {
        return accessLevel;
    }

    if (accessLevel === 'external') {
        return 'external-link';
    }

    return 'request-access';
}
