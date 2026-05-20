export type ModerationIssueType =
    | 'duplicate-research'
    | 'incomplete-metadata'
    | 'policy-violation'
    | 'missing-abstract'
    | 'missing-keywords'
    | 'incomplete-author-affiliation';

export type ModerationStatus =
    | 'pending-review'
    | 'resolved'
    | 'flagged'
    | 'needs-review';

export type FlaggedResearchRecord = {
    id: string;
    title: string;
    agency: string;
    uploadedBy: string;
    uploaderRole?: string;
    issueType: ModerationIssueType;
    year: number;
    status: ModerationStatus;
    dateFlagged: string;
    abstract?: string;
    issueDescription?: string;
    recommendedAction?: string;
    authors?: string[];
};

export type DuplicateResearchMatch = {
    id: string;
    originalTitle: string;
    matchingTitle: string;
    originalAgency: string;
    matchingAgency: string;
    similarityScore: number;
    detectedAt: string;
    originalAuthors?: string[];
    matchingAuthors?: string[];
    originalYear?: number;
    matchingYear?: number;
    matchReason?: string;
    originalAbstract?: string;
    matchingAbstract?: string;
};

export type ModerationActivity = {
    id: string;
    actor: string;
    action: string;
    researchTitle: string;
    timestamp: string;
    type:
        | 'approved'
        | 'revision-requested'
        | 'duplicate-resolved'
        | 'archived'
        | 'version-approved'
        | 'issue-resolved';
};

export type ModerationReportExportOptions = {
    format: 'pdf' | 'csv' | 'excel';
    dateRange:
        | 'last-7-days'
        | 'last-30-days'
        | 'this-month'
        | 'this-year'
        | 'custom';
    startDate?: string;
    endDate?: string;
    includeSummaryMetrics: boolean;
    includeFlaggedRecords: boolean;
    includePendingReview: boolean;
    includeResolvedIssues: boolean;
    includeDuplicateAlerts: boolean;
    includePolicyViolations: boolean;
    includeActivityLog: boolean;
    includeCurrentFilters: boolean;
};

export type ModerationReportExportResult = {
    id: string;
    fileName: string;
    format: ModerationReportExportOptions['format'];
    generatedAt: string;
    status: 'ready';
};

export type ModerationFilters = {
    search: string;
    agency: string;
    issueType: ModerationIssueType | 'all';
    year: string;
    status: ModerationStatus | 'all';
};

export type ModerationSummary = {
    flaggedResearchRecords: number;
    pendingReview: number;
    resolvedIssues: number;
    duplicateResearchAlerts: number;
};

export type ModerationActionPayload = {
    note?: string;
    actor?: string;
};
