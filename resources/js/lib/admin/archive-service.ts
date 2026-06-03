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
    const { meta } = await fetchApi<ResearchApiRecord[]>(
        '/api/admin/archive/research?per_page=1',
    );
    const pagination = meta.pagination as { total?: number } | undefined;

    return {
        archivedResearchRecords: pagination?.total ?? 0,
        archivedAgencies: 0,
        archivedUserAccounts: 0,
        recentlyRestored: 0,
    };
}

export async function getArchivedResearchRecords(): Promise<
    ArchivedResearchRecord[]
> {
    const { data } = await fetchApi<ResearchApiRecord[]>(
        '/api/admin/archive/research?per_page=100',
    );

    return data.map(mapApiResearchRecord);
}

export async function getArchivedAgencyRecords(): Promise<
    ArchivedAgencyRecord[]
> {
    return [];
}

export async function getArchivedUserRecords(): Promise<ArchivedUserRecord[]> {
    return [];
}

export async function getArchiveActivityTimeline(): Promise<ArchiveActivity[]> {
    return [];
}

export async function restoreArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; restoredAt: string }> {
    if (recordType === 'research') {
        const researchId = apiResearchId(id);

        if (researchId) {
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
        }
    }

    throw new Error('Admin archive restore is only configured for persisted research records.');
}

export async function permanentlyDeleteArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; deletedAt: string }> {
    void recordType;
    void id;

    throw new Error('Permanent archive deletion is not configured for production.');
}

export async function exportArchiveReport(
    options: ArchiveExportOptions,
): Promise<GeneratedArchiveReport> {
    void options;

    throw new Error('Archive report export is not configured for production.');
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
