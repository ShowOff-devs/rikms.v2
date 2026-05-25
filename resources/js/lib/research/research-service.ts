import { mockResearchRecords, sdgColors } from '@/data/mock-research';
import type {
    ResearchFacetOptions,
    ResearchFilterOption,
    ResearchQuery,
    ResearchRecord,
    ResearchSearchResult,
} from '@/types/research';

const mockNetworkDelay = (duration = 250) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

const normalize = (value: string | number) => String(value).toLowerCase();

const countValues = (
    values: string[],
    records: ResearchRecord[],
): ResearchFilterOption[] =>
    values.map((value) => ({
        label: value,
        value,
        count: records.filter(
            (record) =>
                record.agency === value ||
                record.category === value ||
                record.sdgs.includes(value) ||
                record.accessLevel === value ||
                record.status === value ||
                String(record.publicationYear) === value,
        ).length,
        color: sdgColors[value],
    }));

const uniqueSorted = (values: string[]) =>
    Array.from(new Set(values)).sort((first, second) =>
        first.localeCompare(second),
    );

export function getResearchFacets(
    records: ResearchRecord[] = mockResearchRecords,
): ResearchFacetOptions {
    const years = Array.from(
        new Set(records.map((record) => record.publicationYear)),
    ).sort((first, second) => second - first);

    return {
        agencies: countValues(
            uniqueSorted(records.map((record) => record.agency)),
            records,
        ),
        categories: countValues(
            uniqueSorted(records.map((record) => record.category)),
            records,
        ),
        sdgs: countValues(
            Array.from({ length: 17 }, (_, index) => `SDG ${index + 1}`),
            records,
        ),
        years: countValues(
            years.map((year) => String(year)),
            records,
        ),
        accessLevels: countValues(
            ['public', 'restricted', 'embargo', 'external'],
            records,
        ),
        statuses: countValues(['published', 'archived'], records),
        minYear: Math.min(...years),
        maxYear: Math.max(...years),
    };
}

function matchesSearch(record: ResearchRecord, search: string) {
    if (!search.trim()) {
        return true;
    }

    const haystack = [
        record.title,
        record.abstract,
        record.authors.join(' '),
        record.agency,
        record.category,
        record.sdgs.join(' '),
        record.keywords.join(' '),
        String(record.publicationYear),
    ]
        .map(normalize)
        .join(' ');

    return haystack.includes(normalize(search.trim()));
}

function filterRecords(records: ResearchRecord[], query: ResearchQuery) {
    return records.filter((record) => {
        const agencyMatch =
            query.agencies.length === 0 ||
            query.agencies.includes(record.agency);
        const categoryMatch =
            query.categories.length === 0 ||
            query.categories.includes(record.category);
        const sdgMatch =
            query.sdgs.length === 0 ||
            query.sdgs.some((sdg) => record.sdgs.includes(sdg));
        const yearMatch =
            query.years.length === 0 ||
            query.years.includes(record.publicationYear);
        const rangeMatch =
            record.publicationYear >= query.yearFrom &&
            record.publicationYear <= query.yearTo;
        const accessMatch =
            query.accessLevels.length === 0 ||
            query.accessLevels.includes(record.accessLevel);
        const statusMatch =
            query.statuses.length === 0 ||
            query.statuses.includes(record.status);

        return (
            matchesSearch(record, query.search) &&
            agencyMatch &&
            categoryMatch &&
            sdgMatch &&
            yearMatch &&
            rangeMatch &&
            accessMatch &&
            statusMatch
        );
    });
}

function sortRecords(records: ResearchRecord[], query: ResearchQuery) {
    return [...records].sort((first, second) => {
        if (query.sort === 'oldest') {
            return first.publicationYear - second.publicationYear;
        }

        if (query.sort === 'title') {
            return first.title.localeCompare(second.title);
        }

        if (query.sort === 'agency') {
            return first.agency.localeCompare(second.agency);
        }

        return (
            second.publicationYear - first.publicationYear ||
            new Date(second.updatedAt).getTime() -
                new Date(first.updatedAt).getTime()
        );
    });
}

export async function searchResearch(
    query: ResearchQuery,
): Promise<ResearchSearchResult> {
    await mockNetworkDelay();

    if (query.search.trim().toLowerCase() === 'error') {
        throw new Error('Unable to load research records. Please try again.');
    }

    const filteredRecords = sortRecords(
        filterRecords(mockResearchRecords, query),
        query,
    );
    const totalPages = Math.max(
        1,
        Math.ceil(filteredRecords.length / query.perPage),
    );
    const safePage = Math.min(Math.max(query.page, 1), totalPages);
    const start = (safePage - 1) * query.perPage;

    return {
        items: filteredRecords.slice(start, start + query.perPage),
        total: filteredRecords.length,
        page: safePage,
        perPage: query.perPage,
        totalPages,
        facets: getResearchFacets(),
    };
}

export async function getResearchRecord(
    id: string,
): Promise<ResearchRecord | null> {
    await mockNetworkDelay(180);

    return mockResearchRecords.find((record) => record.id === id) ?? null;
}
