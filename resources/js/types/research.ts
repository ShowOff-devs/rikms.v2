export type ResearchAccessLevel = 'public' | 'restricted';

export type ResearchStatus = 'published' | 'archived';

export type ResearchSortKey = 'newest' | 'oldest' | 'title' | 'agency';

export type ResearchTag = {
    label: string;
    color: string;
    type: 'sdg' | 'category';
};

export type ResearchRecord = {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    agency: string;
    publicationYear: number;
    category: string;
    sdgs: string[];
    tags: ResearchTag[];
    accessLevel: ResearchAccessLevel;
    status: ResearchStatus;
    downloads: number;
    updatedAt: string;
    keywords: string[];
};

export type ResearchFilters = {
    search: string;
    agencies: string[];
    categories: string[];
    sdgs: string[];
    years: number[];
    accessLevels: ResearchAccessLevel[];
    statuses: ResearchStatus[];
    yearFrom: number;
    yearTo: number;
};

export type ResearchQuery = ResearchFilters & {
    sort: ResearchSortKey;
    page: number;
    perPage: number;
};

export type ResearchFilterOption = {
    label: string;
    value: string;
    count: number;
    color?: string;
};

export type ResearchFacetOptions = {
    agencies: ResearchFilterOption[];
    categories: ResearchFilterOption[];
    sdgs: ResearchFilterOption[];
    years: ResearchFilterOption[];
    accessLevels: ResearchFilterOption[];
    statuses: ResearchFilterOption[];
    minYear: number;
    maxYear: number;
};

export type ResearchSearchResult = {
    items: ResearchRecord[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    facets: ResearchFacetOptions;
};
