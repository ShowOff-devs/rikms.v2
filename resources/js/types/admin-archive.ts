export type ArchiveRecordType = 'research' | 'agency' | 'user';

export type ArchiveStatus = 'archived' | 'pending-deletion' | 'restored';

export type ArchiveDateFilter =
    | 'all'
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'year-2026';

export type ArchiveRecordTypeFilter = 'all' | ArchiveRecordType;

export type ArchivedResearchRecord = {
    id: string;
    type: 'research';
    title: string;
    agency: string;
    authors: string[];
    year: number;
    archivedBy: string;
    archiveDate: string;
    status: ArchiveStatus;
};

export type ArchivedAgencyRecord = {
    id: string;
    type: 'agency';
    name: string;
    shortName: string;
    agencyType: string;
    archivedBy: string;
    archiveDate: string;
    status: ArchiveStatus;
};

export type ArchivedUserRecord = {
    id: string;
    type: 'user';
    fullName: string;
    email: string;
    role: string;
    agency?: string;
    archivedBy: string;
    archiveDate: string;
    status: ArchiveStatus;
};

export type AdminArchivedRecord =
    | ArchivedResearchRecord
    | ArchivedAgencyRecord
    | ArchivedUserRecord;

export type ArchiveActivityType =
    | 'research-archived'
    | 'agency-archived'
    | 'user-archived'
    | 'record-restored'
    | 'record-permanently-deleted'
    | 'pending-deletion';

export type ArchiveActivity = {
    id: string;
    type: ArchiveActivityType;
    title: string;
    recordType: ArchiveRecordType;
    performedBy: string;
    agency?: string;
    timestamp: string;
};

export type ArchiveExportFormat = 'pdf' | 'csv' | 'excel';

export type ArchiveExportDateRange =
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'custom';

export type ArchiveExportOptions = {
    format: ArchiveExportFormat;
    dateRange: ArchiveExportDateRange;
    startDate?: string;
    endDate?: string;
    includeResearch: boolean;
    includeAgencies: boolean;
    includeUsers: boolean;
    includeRestoreActivity: boolean;
    includeDeletionActivity: boolean;
    includePendingDeletion: boolean;
};

export type GeneratedArchiveReport = {
    id: string;
    fileName: string;
    format: ArchiveExportFormat;
    generatedAt: string;
    status: 'ready';
};

export type AdminArchiveSummary = {
    archivedResearchRecords: number;
    archivedAgencies: number;
    archivedUserAccounts: number;
    recentlyRestored: number;
};

export type AdminArchiveFilters = {
    search: string;
    agency: string;
    date: ArchiveDateFilter;
    status: ArchiveStatus | 'all';
    recordType: ArchiveRecordTypeFilter;
};
