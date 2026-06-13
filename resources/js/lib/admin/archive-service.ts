import { fetchApi } from '@/lib/api-client';
import type {
    AdminArchiveSummary,
    AdminArchivedRecord,
    ArchiveActivity,
    ArchiveExportOptions,
    ArchiveRecordType,
    ArchivedAgencyRecord,
    ArchivedFileRecord,
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

type FileApiRecord = {
    id: number;
    original_name: string;
    file_type?: string | null;
    extension?: string | null;
    archived_at?: string | null;
    archived_by_user?: { name?: string | null; email?: string | null } | null;
    research?: {
        title?: string | null;
        agency?: { short_name?: string | null; name?: string | null } | null;
    } | null;
};

type AgencyApiRecord = {
    id: number;
    name: string;
    short_name?: string | null;
    type?: string | null;
    archived_at?: string | null;
    archived_by_user?: { name?: string | null; email?: string | null } | null;
};

type UserApiRecord = {
    id: number;
    name: string;
    email: string;
    role?: string | null;
    roles?: string[];
    archived_at?: string | null;
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
                  : record.type === 'file'
                    ? record.fileName
                    : record.fullName,
        recordType: record.type,
        performedBy,
        agency: record.type === 'agency' ? record.shortName : record.agency,
        timestamp: new Date().toISOString(),
    };
}

export async function getAdminArchiveSummary(): Promise<AdminArchiveSummary> {
    const [research, files, agencies, users, activity] = await Promise.all([
        fetchApi<ResearchApiRecord[]>('/api/admin/archive/research?per_page=1'),
        fetchApi<FileApiRecord[]>('/api/admin/archive/files?per_page=1'),
        fetchApi<AgencyApiRecord[]>('/api/admin/archive/agencies?per_page=1'),
        fetchApi<UserApiRecord[]>('/api/admin/archive/users?per_page=1'),
        fetchApi<ArchiveActivity[]>('/api/admin/archive/activity'),
    ]);

    return {
        archivedResearchRecords: paginationTotal(research.meta),
        archivedFiles: paginationTotal(files.meta),
        archivedAgencies: paginationTotal(agencies.meta),
        archivedUserAccounts: paginationTotal(users.meta),
        recentlyRestored: activity.data.filter(
            (item) => item.type === 'record-restored',
        ).length,
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

export async function getArchivedFileRecords(): Promise<ArchivedFileRecord[]> {
    const { data } = await fetchApi<FileApiRecord[]>(
        '/api/admin/archive/files?per_page=100',
    );

    return data.map(mapApiFileRecord);
}

export async function getArchivedAgencyRecords(): Promise<
    ArchivedAgencyRecord[]
> {
    const { data } = await fetchApi<AgencyApiRecord[]>(
        '/api/admin/archive/agencies?per_page=100',
    );

    return data.map(mapApiAgencyRecord);
}

export async function getArchivedUserRecords(): Promise<ArchivedUserRecord[]> {
    const { data } = await fetchApi<UserApiRecord[]>(
        '/api/admin/archive/users?per_page=100',
    );

    return data.map(mapApiUserRecord);
}

export async function getArchiveActivityTimeline(): Promise<ArchiveActivity[]> {
    const { data } = await fetchApi<ArchiveActivity[]>(
        '/api/admin/archive/activity',
    );

    return data;
}

export async function restoreArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; restoredAt: string }> {
    const apiId = archiveApiId(id, recordType);

    if (apiId) {
        const endpoint = restoreEndpoint(recordType, apiId);

        await fetchApi(endpoint, { method: 'POST' });

        return {
            recordType,
            id,
            restoredAt: new Date().toISOString(),
        };
    }

    throw new Error('Unable to restore archived record.');
}

export async function permanentlyDeleteArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; deletedAt: string }> {
    const apiId = archiveApiId(id, recordType);

    if (apiId) {
        const endpoint = deleteEndpoint(recordType, apiId);

        await fetchApi(endpoint, { method: 'DELETE' });

        return {
            recordType,
            id,
            deletedAt: new Date().toISOString(),
        };
    }

    throw new Error('Unable to delete archived record.');
}

export async function exportArchiveReport(
    options: ArchiveExportOptions,
): Promise<GeneratedArchiveReport> {
    const params = new URLSearchParams({
        include_research: String(options.includeResearch),
        include_files: String(options.includeFiles),
        include_agencies: String(options.includeAgencies),
        include_users: String(options.includeUsers),
    });

    const response = await fetch(`/api/admin/archive/export?${params}`, {
        credentials: 'same-origin',
        headers: {
            Accept: 'text/csv',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Unable to export archive report.');
    }

    const blob = await response.blob();
    const fileName = downloadFileName(response) ?? `admin-archive-report.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    return {
        id: `archive-report-${Date.now()}`,
        fileName,
        format: options.format,
        generatedAt: new Date().toISOString(),
        status: 'ready',
    };
}

function paginationTotal(meta: Record<string, unknown>) {
    const pagination = meta.pagination as { total?: number } | undefined;

    return pagination?.total ?? 0;
}

function archiveApiId(id: string, recordType: ArchiveRecordType) {
    const prefix = `${recordType}-`;

    if (id.startsWith(prefix)) {
        return Number(id.replace(prefix, ''));
    }

    const numericId = Number(id);

    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function restoreEndpoint(recordType: ArchiveRecordType, id: number) {
    if (recordType === 'research') {
        return `/api/admin/research/${id}/restore`;
    }

    if (recordType === 'file') {
        return `/api/admin/research-files/${id}/restore`;
    }

    if (recordType === 'agency') {
        return `/api/admin/agencies/${id}/restore`;
    }

    return `/api/admin/users/${id}/restore`;
}

function deleteEndpoint(recordType: ArchiveRecordType, id: number) {
    if (recordType === 'research') {
        return `/api/admin/research/${id}/archive`;
    }

    if (recordType === 'file') {
        return `/api/admin/research-files/${id}/archive`;
    }

    if (recordType === 'agency') {
        return `/api/admin/agencies/${id}/archive`;
    }

    return `/api/admin/users/${id}/archive`;
}

function downloadFileName(response: Response) {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^"]+)"?/i.exec(disposition);

    return match?.[1];
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

function mapApiFileRecord(record: FileApiRecord): ArchivedFileRecord {
    return {
        id: `file-${record.id}`,
        type: 'file',
        fileName: record.original_name,
        researchTitle: record.research?.title ?? 'Untitled research',
        agency:
            record.research?.agency?.short_name ??
            record.research?.agency?.name ??
            'Unassigned Agency',
        fileType: record.file_type ?? record.extension ?? 'File',
        archivedBy:
            record.archived_by_user?.name ??
            record.archived_by_user?.email ??
            'Super Admin',
        archiveDate: record.archived_at ?? new Date().toISOString(),
        status: 'archived',
    };
}

function mapApiAgencyRecord(record: AgencyApiRecord): ArchivedAgencyRecord {
    return {
        id: `agency-${record.id}`,
        type: 'agency',
        name: record.name,
        shortName: record.short_name ?? record.name,
        agencyType: record.type ?? 'Agency',
        archivedBy:
            record.archived_by_user?.name ??
            record.archived_by_user?.email ??
            'Super Admin',
        archiveDate: record.archived_at ?? new Date().toISOString(),
        status: 'archived',
    };
}

function mapApiUserRecord(record: UserApiRecord): ArchivedUserRecord {
    return {
        id: `user-${record.id}`,
        type: 'user',
        fullName: record.name,
        email: record.email,
        role:
            record.roles?.includes('agency_admin') || record.role === 'agency_admin'
                ? 'Agency Admin'
                : record.role ?? 'User',
        agency:
            record.agency?.short_name ??
            record.agency?.name ??
            undefined,
        archivedBy:
            record.archived_by_user?.name ??
            record.archived_by_user?.email ??
            'Super Admin',
        archiveDate: record.archived_at ?? new Date().toISOString(),
        status: 'archived',
    };
}
