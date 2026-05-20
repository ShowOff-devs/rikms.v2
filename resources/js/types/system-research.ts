export type SystemResearchStatus =
    | 'published'
    | 'under-review'
    | 'draft'
    | 'archived';

export type SystemResearchDocumentType =
    | 'research-study'
    | 'terminal-report'
    | 'project-accomplishment';

export type SystemResearchAccessType =
    | 'public'
    | 'restricted'
    | 'request-access'
    | 'embargo'
    | 'external-link';

export type SystemResearchRecord = {
    id: string;
    title: string;
    authors: string[];
    agencyId: string;
    agencyName: string;
    agencyShortName: string;
    year: number;
    status: SystemResearchStatus;
    category: string;
    sdgs: string[];
    abstract?: string;
    documentType: SystemResearchDocumentType;
    accessType: SystemResearchAccessType;
    downloads: number;
    views: number;
    uploadedAt: string;
    publishedAt?: string;
};

export type SystemResearchFilters = {
    search?: string;
    agency?: string;
    status?: string;
    year?: string;
    category?: string;
    sdg?: string;
    documentType?: string;
};

export type SystemResearchSummary = {
    totalRecords: number;
    published: number;
    underReview: number;
    totalViews: number;
};

export type SystemResearchExportOptions = {
    format: 'pdf' | 'csv' | 'excel';
    dateRange:
        | 'last-7-days'
        | 'last-30-days'
        | 'this-month'
        | 'this-year'
        | 'custom';
    startDate?: string;
    endDate?: string;
    includePublished: boolean;
    includeUnderReview: boolean;
    includeDraft: boolean;
    includeArchived: boolean;
    includeBasicInfo: boolean;
    includeAuthors: boolean;
    includeAgencyInfo: boolean;
    includeMetadata: boolean;
    includeSDGs: boolean;
    includeUsageStats: boolean;
    includeAccessType: boolean;
    includeDates: boolean;
    includeCurrentFilters: boolean;
};

export type SystemResearchExportResult = {
    id: string;
    fileName: string;
    format: SystemResearchExportOptions['format'];
    generatedAt: string;
    status: 'ready';
};
