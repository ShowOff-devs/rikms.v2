import {
    mockAdminArchiveSummary,
    mockArchiveActivityTimeline,
    mockArchivedAgencyRecords,
    mockArchivedResearchRecords,
    mockArchivedUserRecords,
} from '@/data/mock-admin-archive';
import { fetchApi } from '@/lib/api-client';
import type {
    AdminArchiveSummary,
    AdminArchivedRecord,
    ArchiveActivity,
    ArchiveExportOptions,
    ArchiveRecordType,
    ArchivedAgencyRecord,
    ArchivedResearchRecord,
    ArchivedUserRecord,
    GeneratedArchiveReport,
} from '@/types/admin-archive';

type ResearchApiRecord = {
    id: number;
    title: string;
    authors?: string[];
    publication_year?: number | null;
    status: string;
    archived_at?: string | null;
    archive_reason?: string | null;
    agency?: { short_name?: string | null; name?: string | null } | null;
    archived_by_user?: { name?: string | null; email?: string | null } | null;
};

const mockNetworkDelay = (duration = 180) =>
    new Promise<void>((resolve) => {
        if (typeof window === 'undefined') {
            resolve();

            return;
        }

        window.setTimeout(resolve, duration);
    });

const cloneResearchRecord = (
    record: ArchivedResearchRecord,
): ArchivedResearchRecord => ({
    ...record,
    authors: [...record.authors],
});

const cloneAgencyRecord = (
    record: ArchivedAgencyRecord,
): ArchivedAgencyRecord => ({
    ...record,
});

const cloneUserRecord = (record: ArchivedUserRecord): ArchivedUserRecord => ({
    ...record,
});

const cloneActivity = (activity: ArchiveActivity): ArchiveActivity => ({
    ...activity,
});

export function createArchiveActivity(
    type: ArchiveActivity['type'],
    record: AdminArchivedRecord,
    performedBy = 'Super Admin',
): ArchiveActivity {
    return {
        id: `admin-archive-activity-${Date.now()}`,
        type,
        title:
            record.type === 'research'
                ? record.title
                : record.type === 'agency'
                  ? record.name
                  : record.fullName,
        recordType: record.type,
        performedBy,
        agency: record.type === 'agency' ? record.shortName : record.agency,
        timestamp: new Date().toISOString(),
    };
}

export async function getAdminArchiveSummary(): Promise<AdminArchiveSummary> {
    try {
        const { meta } = await fetchApi<ResearchApiRecord[]>(
            '/api/admin/archive/research?per_page=1',
        );
        const pagination = meta.pagination as
            | { total?: number }
            | undefined;

        return {
            ...mockAdminArchiveSummary,
            archivedResearchRecords: pagination?.total ?? 0,
        };
    } catch {
        // TODO Phase 6: Replace this mock fallback after admin archive summary API/flow is verified with real Sanctum authentication.
    }

    await mockNetworkDelay();

    return { ...mockAdminArchiveSummary };
}

export async function getArchivedResearchRecords(): Promise<
    ArchivedResearchRecord[]
> {
    try {
        const { data } = await fetchApi<ResearchApiRecord[]>(
            '/api/admin/archive/research?per_page=100',
        );

        return data.map(mapApiResearchRecord);
    } catch {
        // TODO Phase 6: Replace this mock fallback after admin archive listing is verified with real Sanctum authentication.
    }

    await mockNetworkDelay();

    return mockArchivedResearchRecords.map(cloneResearchRecord);
}

export async function getArchivedAgencyRecords(): Promise<
    ArchivedAgencyRecord[]
> {
    // TODO Phase 6: Replace this mock fallback after admin archived agencies API/flow is verified with real Sanctum authentication.
    await mockNetworkDelay();

    return mockArchivedAgencyRecords.map(cloneAgencyRecord);
}

export async function getArchivedUserRecords(): Promise<ArchivedUserRecord[]> {
    // TODO Phase 6: Replace this mock fallback after admin archived users API/flow is verified with real Sanctum authentication.
    await mockNetworkDelay();

    return mockArchivedUserRecords.map(cloneUserRecord);
}

export async function getArchiveActivityTimeline(): Promise<ArchiveActivity[]> {
    // TODO Phase 6: Replace this mock fallback after admin archive activity API/flow is verified with real Sanctum authentication.
    await mockNetworkDelay();

    return mockArchiveActivityTimeline.map(cloneActivity);
}

export async function restoreArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; restoredAt: string }> {
    if (recordType === 'research') {
        const researchId = apiResearchId(id);

        if (researchId) {
            try {
                await fetchApi<ResearchApiRecord>(
                    `/api/admin/research/${researchId}/restore`,
                    {
                        method: 'POST',
                    },
                );

                return {
                    recordType,
                    id,
                    restoredAt: new Date().toISOString(),
                };
            } catch {
                // TODO Phase 6: Replace this mock fallback after admin archive restore is verified with real Sanctum authentication.
            }
        }
    }

    await mockNetworkDelay(420);

    return {
        recordType,
        id,
        restoredAt: new Date().toISOString(),
    };
}

export async function permanentlyDeleteArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; deletedAt: string }> {
    // TODO Phase 6: Replace this mock fallback after protected archive permanent delete APIs/flows are verified with real Sanctum authentication.
    await mockNetworkDelay(460);

    return {
        recordType,
        id,
        deletedAt: new Date().toISOString(),
    };
}

export async function exportArchiveReport(
    options: ArchiveExportOptions,
): Promise<GeneratedArchiveReport> {
    // TODO Phase 6: Replace this mock fallback after admin archive export API/flow is verified with real Sanctum authentication.
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const extension = options.format === 'excel' ? 'xlsx' : options.format;

    return {
        id: `archive-report-${Date.now()}`,
        fileName: `rikms-archive-report-${generatedAt.slice(0, 10)}.${extension}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}

function apiResearchId(id: string) {
    if (id.startsWith('research-')) {
        return Number(id.replace('research-', ''));
    }

    const numericId = Number(id);

    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function mapApiResearchRecord(
    record: ResearchApiRecord,
): ArchivedResearchRecord {
    return {
        id: `research-${record.id}`,
        type: 'research',
        title: record.title,
        agency:
            record.agency?.short_name ??
            record.agency?.name ??
            'Unassigned Agency',
        authors: record.authors?.length ? record.authors : ['Unspecified'],
        year: record.publication_year ?? new Date().getFullYear(),
        archivedBy:
            record.archived_by_user?.name ??
            record.archived_by_user?.email ??
            'Super Admin',
        archiveDate: record.archived_at ?? new Date().toISOString(),
        status: 'archived',
    };
}
