import {
    mockRepositoryItems,
    repositoryAccessTypeLabels,
    repositoryCategoryColors,
    repositoryDocumentTypeColors,
    repositoryDocumentTypeLabels,
    repositorySdgColors,
    repositoryStatusLabels,
} from '@/data/mock-repository';
import { fetchApi } from '@/lib/api-client';
import type {
    RepositoryAccessType,
    RepositoryAnalytics,
    RepositoryDistributionPoint,
    RepositoryDocumentType,
    RepositoryFacetOption,
    RepositoryFacets,
    RepositoryFileReplacement,
    RepositoryItem,
    RepositoryQuery,
    RepositorySearchResult,
    RepositoryStatus,
    RepositoryUpdatePayload,
} from '@/types/repository';

type AgencyResearchApiRecord = {
    id: number;
    title: string;
    abstract?: string | null;
    authors: string[] | string;
    agency?: { short_name?: string | null; name?: string | null };
    publication_year?: number | null;
    status: string;
    access_level?: string | null;
    sdgs?: string[];
    category?: string | null;
    keywords?: string[];
    downloads: number;
    embargo_until?: string | null;
    external_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

const repositoryStorageKey = 'rikms.repository.items.v1';

const mockNetworkDelay = (duration = 120) =>
    new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(undefined);

            return;
        }

        window.setTimeout(resolve, duration);
    });

const normalize = (value: string | number) => String(value).toLowerCase();

const uniqueSorted = <T extends string | number>(values: T[]) =>
    Array.from(new Set(values)).sort((first, second) =>
        String(first).localeCompare(String(second)),
    );

const countOption = <T extends string | number>(
    value: T,
    label: string,
    count: number,
): RepositoryFacetOption<T> => ({ label, value, count });

const countBy = <T extends string>(
    values: T[],
    colorMap: Record<string, string>,
): RepositoryDistributionPoint[] => {
    const counts = values.reduce<Record<string, number>>((items, value) => {
        items[value] = (items[value] ?? 0) + 1;

        return items;
    }, {});

    return Object.entries(counts)
        .map(([label, value]) => ({
            label,
            value,
            color: colorMap[label] ?? '#1e3a8a',
        }))
        .sort((first, second) => second.value - first.value);
};

const cloneRepositoryItem = (item: RepositoryItem): RepositoryItem => ({
    ...item,
    authors: item.authors.map((author) => ({ ...author })),
    sdgs: [...item.sdgs],
    keywords: [...item.keywords],
    file: { ...item.file },
    versions: item.versions.map((version) => ({ ...version })),
});

function readStoredRepositoryItems(): RepositoryItem[] | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const stored = window.localStorage.getItem(repositoryStorageKey);

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored) as RepositoryItem[];
    } catch {
        window.localStorage.removeItem(repositoryStorageKey);

        return null;
    }
}

function writeStoredRepositoryItems(items: RepositoryItem[]) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(repositoryStorageKey, JSON.stringify(items));
}

export function getRepositoryItemsSnapshot() {
    return (readStoredRepositoryItems() ?? mockRepositoryItems).map(
        cloneRepositoryItem,
    );
}

export async function getRepositoryItems(): Promise<RepositoryItem[]> {
    try {
        const records = await getApiRepositoryItems();

        return records.filter((item) => item.status !== 'archived');
    } catch {
        await mockNetworkDelay();

        return getRepositoryItemsSnapshot().filter(
            (item) => item.status !== 'archived',
        );
    }
}

export async function getArchivedRepositoryItems(): Promise<RepositoryItem[]> {
    await mockNetworkDelay();

    return getRepositoryItemsSnapshot().filter(
        (item) => item.status === 'archived',
    );
}

function updateRepositoryItems(
    updater: (items: RepositoryItem[]) => RepositoryItem[],
) {
    const nextItems = updater(getRepositoryItemsSnapshot());
    writeStoredRepositoryItems(nextItems);

    return nextItems;
}

export function getRepositoryFacets(
    records: RepositoryItem[] = getRepositoryItemsSnapshot(),
): RepositoryFacets {
    return {
        documentTypes: (
            Object.keys(
                repositoryDocumentTypeLabels,
            ) as RepositoryDocumentType[]
        ).map((documentType) =>
            countOption(
                documentType,
                repositoryDocumentTypeLabels[documentType],
                records.filter((record) => record.documentType === documentType)
                    .length,
            ),
        ),
        years: uniqueSorted(records.map((record) => record.year))
            .sort((first, second) => second - first)
            .map((year) =>
                countOption(
                    year,
                    String(year),
                    records.filter((record) => record.year === year).length,
                ),
            ),
        statuses: (
            Object.keys(repositoryStatusLabels) as RepositoryStatus[]
        ).map((status) =>
            countOption(
                status,
                repositoryStatusLabels[status],
                records.filter((record) => record.status === status).length,
            ),
        ),
        sdgs: Array.from({ length: 17 }, (_, index) => `SDG ${index + 1}`).map(
            (sdg) =>
                countOption(
                    sdg,
                    sdg,
                    records.filter((record) => record.sdgs.includes(sdg))
                        .length,
                ),
        ),
        accessTypes: (
            Object.keys(repositoryAccessTypeLabels) as RepositoryAccessType[]
        ).map((accessType) =>
            countOption(
                accessType,
                repositoryAccessTypeLabels[accessType],
                records.filter((record) => record.accessType === accessType)
                    .length,
            ),
        ),
        categories: uniqueSorted(records.map((record) => record.category)).map(
            (category) =>
                countOption(
                    category,
                    category,
                    records.filter((record) => record.category === category)
                        .length,
                ),
        ),
    };
}

function matchesSearch(record: RepositoryItem, search: string) {
    if (!search.trim()) {
        return true;
    }

    const haystack = [
        record.title,
        record.abstract,
        record.authors
            .map((author) => `${author.name} ${author.email}`)
            .join(' '),
        record.agency,
        repositoryDocumentTypeLabels[record.documentType],
        repositoryStatusLabels[record.status],
        repositoryAccessTypeLabels[record.accessType],
        record.category,
        record.keywords.join(' '),
        record.sdgs.join(' '),
        String(record.year),
    ]
        .map(normalize)
        .join(' ');

    return haystack.includes(normalize(search.trim()));
}

export function filterRepositoryItems(
    records: RepositoryItem[],
    query: RepositoryQuery,
) {
    return records.filter((record) => {
        const documentTypeMatch =
            query.documentType === 'all' ||
            record.documentType === query.documentType;
        const yearMatch = query.year === 'all' || record.year === query.year;
        const statusMatch =
            query.status === 'all' || record.status === query.status;
        const sdgMatch = query.sdg === 'all' || record.sdgs.includes(query.sdg);
        const accessTypeMatch =
            query.accessType === 'all' ||
            record.accessType === query.accessType;
        const categoryMatch =
            query.category === 'all' || record.category === query.category;

        return (
            matchesSearch(record, query.search) &&
            documentTypeMatch &&
            yearMatch &&
            statusMatch &&
            sdgMatch &&
            accessTypeMatch &&
            categoryMatch
        );
    });
}

export function sortRepositoryItems(
    records: RepositoryItem[],
    query: Pick<RepositoryQuery, 'sort'>,
) {
    return [...records].sort((first, second) => {
        if (query.sort === 'oldest') {
            return (
                new Date(first.updatedAt).getTime() -
                new Date(second.updatedAt).getTime()
            );
        }

        if (query.sort === 'title-asc') {
            return first.title.localeCompare(second.title);
        }

        if (query.sort === 'title-desc') {
            return second.title.localeCompare(first.title);
        }

        if (query.sort === 'status') {
            return first.status.localeCompare(second.status);
        }

        if (query.sort === 'document-type') {
            return first.documentType.localeCompare(second.documentType);
        }

        return (
            new Date(second.updatedAt).getTime() -
            new Date(first.updatedAt).getTime()
        );
    });
}

export function getRepositoryAnalytics(
    records: RepositoryItem[],
): RepositoryAnalytics {
    const allSdgs = records.flatMap((record) => record.sdgs);
    const sdgDistribution = countBy(allSdgs, repositorySdgColors);
    const documentTypeDistribution = countBy(
        records.map(
            (record) => repositoryDocumentTypeLabels[record.documentType],
        ),
        {
            'Research Study': repositoryDocumentTypeColors['research-study'],
            'Terminal Report': repositoryDocumentTypeColors['terminal-report'],
            'Project Accomplishment Report':
                repositoryDocumentTypeColors['project-accomplishment'],
        },
    );
    const categoryBreakdown = countBy(
        records.map((record) => record.category),
        repositoryCategoryColors,
    );

    return {
        totalDocuments: records.length,
        publishedDocuments: records.filter(
            (record) => record.status === 'published',
        ).length,
        sdgCount: new Set(allSdgs).size,
        aiTaggedCount: records.filter((record) => record.isAiTagged).length,
        sdgDistribution,
        documentTypeDistribution,
        topSdgs: sdgDistribution.slice(0, 8),
        categoryBreakdown,
    };
}

export async function searchRepository(
    query: RepositoryQuery,
): Promise<RepositorySearchResult> {
    try {
        const records = await getRepositoryItems();
        const filteredItems = sortRepositoryItems(
            filterRepositoryItems(records, query),
            query,
        );
        const totalPages = Math.max(
            1,
            Math.ceil(filteredItems.length / query.perPage),
        );
        const page = Math.min(Math.max(query.page, 1), totalPages);
        const start = (page - 1) * query.perPage;

        return {
            items: filteredItems.slice(start, start + query.perPage),
            filteredItems,
            total: filteredItems.length,
            page,
            perPage: query.perPage,
            totalPages,
            facets: getRepositoryFacets(records),
            analytics: getRepositoryAnalytics(filteredItems),
        };
    } catch {
        await mockNetworkDelay();

        const records = getRepositoryItemsSnapshot().filter(
            (item) => item.status !== 'archived',
        );
        const filteredItems = sortRepositoryItems(
            filterRepositoryItems(records, query),
            query,
        );
        const totalPages = Math.max(
            1,
            Math.ceil(filteredItems.length / query.perPage),
        );
        const page = Math.min(Math.max(query.page, 1), totalPages);
        const start = (page - 1) * query.perPage;

        return {
            items: filteredItems.slice(start, start + query.perPage),
            filteredItems,
            total: filteredItems.length,
            page,
            perPage: query.perPage,
            totalPages,
            facets: getRepositoryFacets(records),
            analytics: getRepositoryAnalytics(filteredItems),
        };
    }
}

export async function getRepositoryItemById(
    id: string,
): Promise<RepositoryItem | null> {
    try {
        const { data } = await fetchApi<AgencyResearchApiRecord>(
            `/api/agency/research/${id}`,
        );

        return mapRepositoryItemFromApi(data);
    } catch {
        await mockNetworkDelay(160);

        return (
            getRepositoryItemsSnapshot().find((record) => record.id === id) ??
            null
        );
    }
}

export async function updateRepositoryItem(
    id: string,
    payload: RepositoryUpdatePayload,
): Promise<RepositoryItem | null> {
    await mockNetworkDelay(260);

    let updatedItem: RepositoryItem | null = null;

    updateRepositoryItems((items) =>
        items.map((item) => {
            if (item.id !== id) {
                return item;
            }

            updatedItem = {
                ...item,
                ...payload,
                updatedAt: new Date().toISOString(),
                versions: [
                    {
                        id: `${id}-v${item.versions.length + 1}`,
                        label: 'Metadata changes saved',
                        actor: 'Agency Admin',
                        timestamp: new Date().toISOString(),
                    },
                    ...payload.versions,
                ],
            };

            return updatedItem;
        }),
    );

    return updatedItem ? cloneRepositoryItem(updatedItem) : null;
}

export async function saveRepositoryItemAsDraft(
    id: string,
    payload: RepositoryUpdatePayload,
) {
    return updateRepositoryItem(id, { ...payload, status: 'draft' });
}

export async function publishRepositoryItem(
    id: string,
    payload: RepositoryUpdatePayload,
) {
    return updateRepositoryItem(id, { ...payload, status: 'published' });
}

export async function archiveRepositoryItem(
    id: string,
): Promise<RepositoryItem | null> {
    const item = await getRepositoryItemById(id);

    if (!item) {
        return null;
    }

    return updateRepositoryItem(id, {
        ...item,
        status: 'archived',
    });
}

export async function restoreRepositoryItem(
    id: string,
): Promise<RepositoryItem | null> {
    const item = await getRepositoryItemById(id);

    if (!item) {
        return null;
    }

    return updateRepositoryItem(id, {
        ...item,
        status: 'draft',
    });
}

export async function replaceRepositoryFile(
    id: string,
    file: RepositoryFileReplacement,
): Promise<RepositoryItem | null> {
    const item = await getRepositoryItemById(id);

    if (!item) {
        return null;
    }

    return updateRepositoryItem(id, {
        ...item,
        file: {
            name: file.name,
            size: file.size,
            type: file.type,
            pages: file.pages ?? item.file.pages,
            uploadedAt: new Date().toISOString(),
        },
    });
}

async function getApiRepositoryItems() {
    const { data } = await fetchApi<AgencyResearchApiRecord[]>(
        '/api/agency/research?per_page=100',
    );

    return data.map(mapRepositoryItemFromApi);
}

function mapRepositoryItemFromApi(record: AgencyResearchApiRecord): RepositoryItem {
    const authors = Array.isArray(record.authors)
        ? record.authors
        : record.authors
              .split(',')
              .map((author) => author.trim())
              .filter(Boolean);

    return {
        id: String(record.id),
        title: record.title,
        abstract: record.abstract ?? '',
        authors: authors.map((name) => ({ name, email: '' })),
        agency: record.agency?.short_name ?? record.agency?.name ?? '',
        documentType: 'research-study',
        year: record.publication_year ?? new Date().getFullYear(),
        status: mapRepositoryStatus(record.status),
        accessType: mapRepositoryAccessType(record.access_level),
        sdgs: record.sdgs ?? [],
        category: record.category ?? 'Uncategorized',
        keywords: record.keywords ?? [],
        metadataCompletion: 85,
        digitalLibraryScore: Math.min(100, 70 + Math.min(record.downloads, 30)),
        isAiTagged: false,
        publisher: record.agency?.name ?? '',
        externalLink: record.external_url ?? undefined,
        embargoUntil: record.embargo_until ?? undefined,
        file: {
            name: `${record.title}.pdf`,
            size: 'Pending metadata',
            uploadedAt: record.created_at ?? new Date().toISOString(),
            type: 'PDF',
            pages: 0,
        },
        versions: [
            {
                id: `${record.id}-current`,
                label: 'Current relational record',
                actor: 'RIKMS',
                timestamp: record.updated_at ?? new Date().toISOString(),
            },
        ],
        createdAt: record.created_at ?? new Date().toISOString(),
        updatedAt: record.updated_at ?? new Date().toISOString(),
    };
}

function mapRepositoryStatus(status: string): RepositoryStatus {
    if (status === 'draft' || status === 'published' || status === 'archived') {
        return status;
    }

    if (status === 'submitted' || status === 'under_review') {
        return 'pending';
    }

    return 'restricted';
}

function mapRepositoryAccessType(accessLevel?: string | null): RepositoryAccessType {
    if (accessLevel === 'public' || accessLevel === 'restricted' || accessLevel === 'embargo') {
        return accessLevel;
    }

    if (accessLevel === 'external') {
        return 'external-link';
    }

    return 'request-access';
}
