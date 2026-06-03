import { fetchApi } from '@/lib/api-client';
import type {
    ArchiveActivity,
    ArchiveFilters,
    ArchivedResearch,
} from '@/types/archive';

type ResearchApiRecord = {
    id: number;
    agency?: { short_name?: string | null; name?: string | null } | null;
    title: string;
    authors?: string[];
    publication_year?: number | null;
    category?: string | null;
    access_level?: string | null;
    status: string;
    archived_at?: string | null;
    archived_by_user?: { name?: string | null; email?: string | null } | null;
};

const cloneArchivedResearch = (record: ArchivedResearch): ArchivedResearch => ({
    ...record,
    authors: [...record.authors],
});

function normalize(value: string | number) {
    return String(value).toLowerCase();
}

function formatActivityDate(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(value);
}

function formatActivityTime(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(value);
}

export function createArchiveActivity(
    type: ArchiveActivity['type'],
    description: string,
    performedBy = 'Agency Admin',
): ArchiveActivity {
    const now = new Date();
    const titleMap: Record<ArchiveActivity['type'], string> = {
        'research-archived': 'Research archived',
        'research-restored': 'Research restored',
        'research-permanently-deleted': 'Research permanently deleted',
    };

    return {
        id: `aa-${now.getTime()}`,
        type,
        title: titleMap[type],
        description,
        date: formatActivityDate(now),
        time: formatActivityTime(now),
        performedBy,
    };
}

export async function getArchivedResearch(): Promise<ArchivedResearch[]> {
    const { data } = await fetchApi<ResearchApiRecord[]>(
        '/api/agency/archive/research?per_page=100',
    );

    return data.map(mapApiArchivedResearch);
}

export function searchArchivedResearch(
    records: ArchivedResearch[],
    search: string,
) {
    const query = search.trim();

    if (!query) {
        return records.map(cloneArchivedResearch);
    }

    const normalizedQuery = normalize(query);

    return records
        .filter((record) =>
            [
                record.title,
                record.authors.join(' '),
                record.year,
                record.archivedBy,
            ]
                .map(normalize)
                .join(' ')
                .includes(normalizedQuery),
        )
        .map(cloneArchivedResearch);
}

export function filterArchivedResearch(
    records: ArchivedResearch[],
    filters: ArchiveFilters,
) {
    const searchedRecords = searchArchivedResearch(records, filters.search);
    const now = new Date();

    return searchedRecords.filter((record) => {
        const archiveDate = new Date(record.archiveDate);
        const daysOld =
            (now.getTime() - archiveDate.getTime()) / (1000 * 60 * 60 * 24);
        const documentTypeMatches =
            filters.documentType === 'all' ||
            record.documentType === filters.documentType;
        const dateMatches =
            filters.date === 'all' ||
            (filters.date === 'last-7-days' && daysOld <= 7) ||
            (filters.date === 'last-30-days' && daysOld <= 30) ||
            (filters.date === 'year-2026' &&
                archiveDate.getFullYear() === 2026);

        return documentTypeMatches && dateMatches;
    });
}

export async function restoreArchivedResearch(
    id: string,
): Promise<ArchivedResearch | null> {
    const researchId = apiResearchId(id);

    if (researchId) {
        const { data } = await fetchApi<ResearchApiRecord>(
            `/api/agency/research/${researchId}/restore`,
            {
                method: 'POST',
            },
        );

        return mapApiArchivedResearch({
            ...data,
            status: 'archived',
            archived_at: data.archived_at ?? new Date().toISOString(),
        });
    }

    throw new Error('Archived research restore requires a persisted API record.');
}

export async function permanentlyDeleteArchivedResearch(
    id: string,
): Promise<ArchivedResearch | null> {
    void id;

    throw new Error('Permanent archive deletion is not configured for production.');
}

export async function getArchiveActivity(): Promise<ArchiveActivity[]> {
    return [];
}

function apiResearchId(id: string) {
    if (id.startsWith('research-')) {
        return Number(id.replace('research-', ''));
    }

    const numericId = Number(id);

    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function mapApiArchivedResearch(record: ResearchApiRecord): ArchivedResearch {
    return {
        id: `research-${record.id}`,
        title: record.title,
        authors: record.authors?.length ? record.authors : ['Unspecified'],
        year: record.publication_year ?? new Date().getFullYear(),
        archiveDate: record.archived_at ?? new Date().toISOString(),
        archivedBy:
            record.archived_by_user?.name ??
            record.archived_by_user?.email ??
            'Agency Admin',
        status: 'archived',
        originalStatus:
            record.access_level === 'restricted' ? 'restricted' : 'published',
        documentType: 'research-study',
        agency:
            record.agency?.short_name ??
            record.agency?.name ??
            'Agency Repository',
        repositoryItemId: String(record.id),
    };
}
