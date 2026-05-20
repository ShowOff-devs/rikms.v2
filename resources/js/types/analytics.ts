export type AnalyticsFilters = {
    year?: string;
    documentType?: string;
    category?: string;
    sdg?: string;
    status?: string;
    accessType?: string;
};

export type TrendDirection = 'up' | 'down' | 'neutral';

export type SummaryMetric = {
    id: string;
    label: string;
    value: number;
    trend?: number;
    trendDirection?: TrendDirection;
};

export type YearlyPublication = {
    year: number;
    count: number;
};

export type CategoryDistribution = {
    category: string;
    count: number;
    color: string;
};

export type SDGContribution = {
    sdg: string;
    label: string;
    count: number;
    percentage: number;
};

export type MostAccessedResearch = {
    id: string;
    title: string;
    category: string;
    year: number;
    downloads: number;
    views: number;
};

export type AccessRequestBreakdown = {
    approved: number;
    pending: number;
    denied: number;
};

export type DownloadTrend = {
    month: string;
    downloads: number;
};

export type AnalyticsResearchStatus = 'approved' | 'pending' | 'denied';

export type AnalyticsResearchRecord = {
    id: string;
    title: string;
    category: string;
    year: number;
    documentType: string;
    sdgs: number[];
    status: AnalyticsResearchStatus;
    accessType: string;
    downloads: number;
    views: number;
    accessRequests: number;
    monthlyDownloads: number[];
};

export type AnalyticsFilterOptions = {
    years: string[];
    documentTypes: string[];
    categories: string[];
    sdgs: string[];
    statuses: string[];
    accessTypes: string[];
};

export type AgencyAnalyticsPayload = {
    filters: AnalyticsFilters;
    summaryMetrics: SummaryMetric[];
    yearlyPublications: YearlyPublication[];
    categoryDistribution: CategoryDistribution[];
    sdgContributions: SDGContribution[];
    mostAccessedResearch: MostAccessedResearch[];
    accessRequestBreakdown: AccessRequestBreakdown;
    downloadTrends: DownloadTrend[];
    records: AnalyticsResearchRecord[];
    filterOptions: AnalyticsFilterOptions;
};

export type AnalyticsExportResult = {
    success: boolean;
    fileName: string;
    generatedAt: string;
    filters: AnalyticsFilters;
};
