import { mockArchiveActivity, mockArchivedResearch } from '@/data/mock-archive';
import {
    getRepositoryItemsSnapshot,
    updateRepositoryItem,
} from '@/lib/repository/repository-service';
import type {
    ArchiveActivity,
    ArchiveFilters,
    ArchivedResearch,
} from '@/types/archive';
import type { RepositoryStatus } from '@/types/repository';

const archiveStorageKey = 'rikms.archive.records.v1';
const activityStorageKey = 'rikms.archive.activity.v1';
const deletedArchiveStorageKey = 'rikms.archive.deleted.v1';

const mockNetworkDelay = (duration = 120) =>
    new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(undefined);

            return;
        }

        window.setTimeout(resolve, duration);
    });

const cloneArchivedResearch = (record: ArchivedResearch): ArchivedResearch => ({
    ...record,
    authors: [...record.authors],
});

const cloneActivity = (activity: ArchiveActivity): ArchiveActivity => ({
    ...activity,
});

function readStoredRecords<T>(key: string): T[] | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const stored = window.localStorage.getItem(key);

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored) as T[];
    } catch {
        window.localStorage.removeItem(key);

        return null;
    }
}

function writeStoredRecords<T>(key: string, records: T[]) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(key, JSON.stringify(records));
}

function readDeletedArchiveIds() {
    return readStoredRecords<string>(deletedArchiveStorageKey) ?? [];
}

function addDeletedArchiveIds(ids: string[]) {
    writeStoredRecords(
        deletedArchiveStorageKey,
        Array.from(new Set([...readDeletedArchiveIds(), ...ids])),
    );
}

function getStoredOrSeededArchivedResearch() {
    return (
        readStoredRecords<ArchivedResearch>(archiveStorageKey) ??
        mockArchivedResearch
    );
}

function getRepositoryArchivedResearch() {
    const deletedIds = readDeletedArchiveIds();

    return getRepositoryItemsSnapshot()
        .filter((item) => item.status === 'archived')
        .map<ArchivedResearch>((item) => ({
            id: `repository-${item.id}`,
            title: item.title,
            authors: item.authors.map((author) => author.name),
            year: item.year,
            archiveDate: item.updatedAt,
            archivedBy: 'Agency Admin',
            status: 'archived',
            originalStatus:
                item.accessType === 'restricted' ? 'restricted' : 'published',
            documentType: item.documentType,
            agency: item.agency,
            repositoryItemId: item.id,
        }))
        .filter(
            (item) =>
                !deletedIds.includes(item.id) &&
                !deletedIds.includes(item.repositoryItemId ?? ''),
        );
}

function getArchivedResearchSnapshot() {
    const storedRecords = getStoredOrSeededArchivedResearch();
    const repositoryRecords = getRepositoryArchivedResearch();
    const repositoryIds = new Set(
        storedRecords.map((record) => record.repositoryItemId).filter(Boolean),
    );

    return [
        ...storedRecords,
        ...repositoryRecords.filter(
            (record) => !repositoryIds.has(record.repositoryItemId),
        ),
    ].map(cloneArchivedResearch);
}

function writeArchivedResearchSnapshot(records: ArchivedResearch[]) {
    writeStoredRecords(archiveStorageKey, records.map(cloneArchivedResearch));
}

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
    await mockNetworkDelay();

    return getArchivedResearchSnapshot();
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
    await mockNetworkDelay(220);

    const records = getArchivedResearchSnapshot();
    const restoredRecord = records.find((record) => record.id === id) ?? null;

    if (!restoredRecord) {
        return null;
    }

    writeArchivedResearchSnapshot(records.filter((record) => record.id !== id));
    addDeletedArchiveIds([id, restoredRecord.repositoryItemId ?? '']);

    if (restoredRecord.repositoryItemId) {
        const repositoryItem = getRepositoryItemsSnapshot().find(
            (item) => item.id === restoredRecord.repositoryItemId,
        );
        const restoredStatus = (restoredRecord.originalStatus ??
            'published') as RepositoryStatus;

        if (repositoryItem) {
            await updateRepositoryItem(restoredRecord.repositoryItemId, {
                ...repositoryItem,
                status: restoredStatus,
            });
        }
    }

    return cloneArchivedResearch(restoredRecord);
}

export async function permanentlyDeleteArchivedResearch(
    id: string,
): Promise<ArchivedResearch | null> {
    await mockNetworkDelay(260);

    const records = getArchivedResearchSnapshot();
    const deletedRecord = records.find((record) => record.id === id) ?? null;

    if (!deletedRecord) {
        return null;
    }

    writeArchivedResearchSnapshot(records.filter((record) => record.id !== id));
    addDeletedArchiveIds([id, deletedRecord.repositoryItemId ?? '']);

    return cloneArchivedResearch(deletedRecord);
}

export async function getArchiveActivity(): Promise<ArchiveActivity[]> {
    await mockNetworkDelay();

    return (
        readStoredRecords<ArchiveActivity>(activityStorageKey) ??
        mockArchiveActivity
    ).map(cloneActivity);
}

export function addArchiveActivity(activity: ArchiveActivity) {
    const nextActivities = [
        cloneActivity(activity),
        ...(readStoredRecords<ArchiveActivity>(activityStorageKey) ??
            mockArchiveActivity),
    ];

    writeStoredRecords(activityStorageKey, nextActivities);

    return nextActivities.map(cloneActivity);
}
