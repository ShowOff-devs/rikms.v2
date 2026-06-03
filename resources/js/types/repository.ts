export type RepositoryDocumentType =
    | 'research-study'
    | 'terminal-report'
    | 'project-accomplishment';

export type RepositoryStatus =
    | 'draft'
    | 'published'
    | 'pending'
    | 'restricted'
    | 'archived';

export type RepositoryAccessType =
    | 'public'
    | 'restricted'
    | 'request-access'
    | 'embargo'
    | 'external-link';

export type RepositoryAuthor = {
    name: string;
    email: string;
};

export type RepositoryFileInfo = {
    name: string;
    size: string;
    uploadedAt: string;
    type: string;
    pages: number;
};

export type RepositoryVersion = {
    id: string;
    label: string;
    actor: string;
    timestamp: string;
};

export type RepositoryItem = {
    id: string;
    title: string;
    abstract: string;
    authors: RepositoryAuthor[];
    agency: string;
    documentType: RepositoryDocumentType;
    year: number;
    status: RepositoryStatus;
    accessType: RepositoryAccessType;
    sdgs: string[];
    category: string;
    keywords: string[];
    metadataCompletion: number;
    digitalLibraryScore: number;
    isAiTagged: boolean;
    publisher: string;
    doi?: string;
    isbn?: string;
    externalLink?: string;
    embargoUntil?: string;
    file: RepositoryFileInfo;
    versions: RepositoryVersion[];
    createdAt: string;
    updatedAt: string;
};

export type RepositoryUpdatePayload = Omit<
    RepositoryItem,
    'id' | 'createdAt' | 'updatedAt'
>;

export type RepositoryFileReplacement = {
    name: string;
    size: string;
    type: string;
    pages?: number;
    file?: File;
};

export type RepositorySortKey =
    | 'newest'
    | 'oldest'
    | 'title-asc'
    | 'title-desc'
    | 'status'
    | 'document-type';

export type RepositoryViewMode = 'grid' | 'list';

export type RepositoryQuery = {
    search: string;
    documentType: RepositoryDocumentType | 'all';
    year: number | 'all';
    status: RepositoryStatus | 'all';
    sdg: string | 'all';
    accessType: RepositoryAccessType | 'all';
    category: string | 'all';
    sort: RepositorySortKey;
    page: number;
    perPage: number;
};

export type RepositoryFacetOption<T extends string | number = string> = {
    label: string;
    value: T;
    count: number;
};

export type RepositoryFacets = {
    documentTypes: RepositoryFacetOption<RepositoryDocumentType>[];
    years: RepositoryFacetOption<number>[];
    statuses: RepositoryFacetOption<RepositoryStatus>[];
    sdgs: RepositoryFacetOption[];
    accessTypes: RepositoryFacetOption<RepositoryAccessType>[];
    categories: RepositoryFacetOption[];
};

export type RepositoryDistributionPoint = {
    label: string;
    value: number;
    color: string;
};

export type RepositoryAnalytics = {
    totalDocuments: number;
    publishedDocuments: number;
    sdgCount: number;
    aiTaggedCount: number;
    sdgDistribution: RepositoryDistributionPoint[];
    documentTypeDistribution: RepositoryDistributionPoint[];
    topSdgs: RepositoryDistributionPoint[];
    categoryBreakdown: RepositoryDistributionPoint[];
};

export type RepositorySearchResult = {
    items: RepositoryItem[];
    filteredItems: RepositoryItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    facets: RepositoryFacets;
    analytics: RepositoryAnalytics;
};
