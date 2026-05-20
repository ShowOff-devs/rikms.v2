export type ArchivedResearchStatus = 'archived';

export type ArchivedResearchOriginalStatus =
    | 'published'
    | 'draft'
    | 'restricted';

export type ArchivedResearchDocumentType =
    | 'research-study'
    | 'terminal-report'
    | 'project-accomplishment';

export type ArchivedResearch = {
    id: string;
    title: string;
    authors: string[];
    year: number;
    archiveDate: string;
    archivedBy: string;
    status: ArchivedResearchStatus;
    originalStatus?: ArchivedResearchOriginalStatus;
    documentType: ArchivedResearchDocumentType;
    agency: string;
    repositoryItemId?: string;
};

export type ArchiveActivityType =
    | 'research-archived'
    | 'research-restored'
    | 'research-permanently-deleted';

export type ArchiveActivity = {
    id: string;
    type: ArchiveActivityType;
    title: string;
    description?: string;
    date: string;
    time: string;
    performedBy: string;
};

export type ArchiveStatusFilter = 'all' | ArchivedResearchStatus;

export type ArchiveDateFilter =
    | 'all'
    | 'last-7-days'
    | 'last-30-days'
    | 'year-2026';

export type ArchiveDocumentTypeFilter = 'all' | ArchivedResearchDocumentType;

export type ArchiveFilters = {
    search: string;
    documentType: ArchiveDocumentTypeFilter;
    date: ArchiveDateFilter;
};
