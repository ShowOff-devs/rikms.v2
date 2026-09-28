import { fetchApi } from '@/lib/api-client';
import { downloadResponseFile } from '@/lib/download-file';
import type {
    AdminArchiveSummary,
    AdminArchiveFilters,
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

type ArchivePaginationMeta = {
    pagination?: {
        current_page?: number;
        per_page?: number;
        total?: number;
        last_page?: number;
    };
};

export type ArchivedRecordsPage = {
    records: AdminArchivedRecord[];
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
};

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
        fetchApi<ArchiveActivity[], { recently_restored?: number }>(
            '/api/admin/archive/activity?per_page=1',
        ),
    ]);

    return {
        archivedResearchRecords: paginationTotal(research.meta),
        archivedFiles: paginationTotal(files.meta),
        archivedAgencies: paginationTotal(agencies.meta),
        archivedUserAccounts: paginationTotal(users.meta),
        recentlyRestored: activity.meta.recently_restored ?? 0,
    };
}

export async function getArchivedRecordsPage(
    recordType: ArchiveRecordType,
    options: {
        page: number;
        perPage: number;
        filters: AdminArchiveFilters;
        topbarSearch?: string;
    },
): Promise<ArchivedRecordsPage> {
    if (
        options.filters.status === 'restored' ||
        options.filters.status === 'pending-deletion' ||
        (options.filters.recordType !== 'all' &&
            options.filters.recordType !== recordType)
    ) {
        return {
            records: [],
            currentPage: 1,
            perPage: options.perPage,
            total: 0,
            lastPage: 1,
        };
    }

    const params = new URLSearchParams({
        page: String(options.page),
        per_page: String(options.perPage),
        date: options.filters.date,
    });
    const keyword = [options.filters.search, options.topbarSearch]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(' ');

    if (keyword) {
        params.set('keyword', keyword);
    }

    if (options.filters.agency !== 'all') {
        params.set('agency', options.filters.agency);
    }

    const endpoint = {
        research: '/api/admin/archive/research',
        file: '/api/admin/archive/files',
        agency: '/api/admin/archive/agencies',
        user: '/api/admin/archive/users',
    }[recordType];
    const response = await fetchApi<
        | ResearchApiRecord[]
        | FileApiRecord[]
        | AgencyApiRecord[]
        | UserApiRecord[],
        ArchivePaginationMeta
    >(`${endpoint}?${params}`);
    const records = response.data.map((record) => {
        if (recordType === 'research') {
            return mapApiResearchRecord(record as ResearchApiRecord);
        }

        if (recordType === 'file') {
            return mapApiFileRecord(record as FileApiRecord);
        }

        if (recordType === 'agency') {
            return mapApiAgencyRecord(record as AgencyApiRecord);
        }

        return mapApiUserRecord(record as UserApiRecord);
    });
    const pagination = response.meta.pagination;

    return {
        records,
        currentPage: pagination?.current_page ?? options.page,
        perPage: pagination?.per_page ?? options.perPage,
        total: pagination?.total ?? records.length,
        lastPage: pagination?.last_page ?? 1,
    };
}

export async function getArchiveFilterOptions(): Promise<string[]> {
    const response = await fetchApi<{ agencies: string[] }>(
        '/api/admin/archive/filter-options',
    );

    return response.data.agencies;
}

export async function getArchiveActivityTimeline(page = 1): Promise<{
    activities: ArchiveActivity[];
    currentPage: number;
    lastPage: number;
}> {
    const response = await fetchApi<ArchiveActivity[], ArchivePaginationMeta>(
        `/api/admin/archive/activity?per_page=50&page=${page}`,
    );

    return {
        activities: response.data,
        currentPage: response.meta.pagination?.current_page ?? page,
        lastPage: response.meta.pagination?.last_page ?? 1,
    };
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

    const { fileName } = await downloadResponseFile(
        response,
        'admin-archive-report.csv',
    );

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
            record.roles?.includes('agency_admin') ||
            record.role === 'agency_admin'
                ? 'Agency Admin'
                : (record.role ?? 'User'),
        agency: record.agency?.short_name ?? record.agency?.name ?? undefined,
        archivedBy:
            record.archived_by_user?.name ??
            record.archived_by_user?.email ??
            'Super Admin',
        archiveDate: record.archived_at ?? new Date().toISOString(),
        status: 'archived',
    };
}
