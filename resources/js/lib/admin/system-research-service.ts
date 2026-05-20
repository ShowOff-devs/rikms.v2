import { systemResearchRecords } from '@/data/mock-system-research';
import type {
    SystemResearchExportOptions,
    SystemResearchExportResult,
    SystemResearchFilters,
    SystemResearchRecord,
    SystemResearchSummary,
} from '@/types/system-research';

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

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

        if (isFilterActive(filters.status) && record.status !== filters.status) {
            return false;
        }

        if (isFilterActive(filters.year) && String(record.year) !== filters.year) {
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
    await mockNetworkDelay();

    return filterSystemResearchRecords(systemResearchRecords, filters);
}

export async function getSystemResearchSummary(
    filters: SystemResearchFilters = {},
): Promise<SystemResearchSummary> {
    await mockNetworkDelay();

    return createSystemResearchSummary(
        filterSystemResearchRecords(systemResearchRecords, filters),
    );
}

export async function getSystemResearchRecordById(
    id: string,
): Promise<SystemResearchRecord | null> {
    await mockNetworkDelay();

    return systemResearchRecords.find((record) => record.id === id) ?? null;
}

export async function exportSystemResearchRecords(
    options: SystemResearchExportOptions,
): Promise<SystemResearchExportResult> {
    await mockNetworkDelay(900);

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
