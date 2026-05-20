export type SystemAnalyticsFilters = {
    agency?: string;
    publicationYear?: string;
    researchCategory?: string;
    sdg?: string;
    documentType?: string;
    accessType?: string;
    status?: string;
};

export type SystemAnalyticsMetric = {
    id: string;
    label: string;
    value: number;
    icon?: string;
    helperText?: string;
    trend?: number;
};

export type ResearchUploadTrend = {
    year: number;
    count: number;
};

export type ResearchByAgency = {
    agency: string;
    count: number;
};

export type ResearchByCategory = {
    category: string;
    count: number;
    color: string;
};

export type SDGContribution = {
    sdg: string;
    label: string;
    count: number;
    percentage?: number;
    color?: string;
};

export type MostAccessedResearch = {
    id: string;
    title: string;
    agency: string;
    year: number;
    views: number;
    downloads: number;
};

export type AccessRequestStatusSummary = {
    approved: number;
    pending: number;
    denied: number;
};

export type PlatformUsageActivity = {
    month: string;
    repositoryViews: number;
    downloads: number;
    accessRequests: number;
};

export type AnalyticsExportFormat = 'pdf' | 'csv' | 'excel';

export type AnalyticsExportDateRange =
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'this-year'
    | 'custom';

export type AnalyticsExportOptions = {
    format: AnalyticsExportFormat;
    dateRange: AnalyticsExportDateRange;
    startDate?: string;
    endDate?: string;
    includeSummaryMetrics: boolean;
    includeUploadTrends: boolean;
    includeResearchByAgency: boolean;
    includeResearchByCategory: boolean;
    includeSDGContribution: boolean;
    includeMostAccessedResearch: boolean;
    includeAccessRequestStatus: boolean;
    includePlatformUsageActivity: boolean;
    includeCurrentFilters: boolean;
};

export type AnalyticsExportResult = {
    id: string;
    fileName: string;
    format: AnalyticsExportFormat;
    generatedAt: string;
    status: 'ready';
};

export type SystemAnalyticsFilterOptions = {
    agencies: string[];
    publicationYears: string[];
    researchCategories: string[];
    sdgs: Array<{ value: string; label: string }>;
    documentTypes: string[];
    accessTypes: string[];
    statuses: string[];
};

export type SystemAnalyticsPayload = {
    metrics: SystemAnalyticsMetric[];
    uploadTrends: ResearchUploadTrend[];
    researchByAgency: ResearchByAgency[];
    researchByCategory: ResearchByCategory[];
    sdgContribution: SDGContribution[];
    mostAccessedResearch: MostAccessedResearch[];
    accessRequestStatus: AccessRequestStatusSummary;
    platformUsageActivity: PlatformUsageActivity[];
    filterOptions: SystemAnalyticsFilterOptions;
};

export type SystemResearchAnalyticsRecord = {
    id: string;
    title: string;
    agency: string;
    year: number;
    category: string;
    sdg: string;
    sdgLabel: string;
    documentType: string;
    accessType: string;
    status: 'approved' | 'pending' | 'denied';
    views: number;
    downloads: number;
    activeAgencyAdmins: number;
    accessRequests: AccessRequestStatusSummary;
};
