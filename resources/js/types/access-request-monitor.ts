export type AccessRequestStatus = 'approved' | 'pending' | 'denied';

export type AccessRequestAuditStatus = 'unreviewed' | 'reviewed';

export type AccessRequestAuditTrailEntry = {
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    notes?: string;
};

export type AccessRequestMonitorRecord = {
    id: string;
    requesterName: string;
    requesterEmail: string;
    organization: string;
    researchTitle: string;
    researchId: string;
    agencyId: string;
    agencyShortName: string;
    agencyName: string;
    requestDate: string;
    status: AccessRequestStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    requestMessage?: string;
    requestedAccessType?: string;
    researchAccessPolicy?: string;
    decisionReason?: string;
    reviewerNotes?: string;
    policyRuleUsed?: string;
    processingDuration?: string;
    reviewerIpAddress?: string;
    reviewerDevice?: string;
    auditStatus?: AccessRequestAuditStatus;
    auditTrail?: AccessRequestAuditTrailEntry[];
};

export type AccessRequestMonitorFilters = {
    search: string;
    agency: string;
    status: AccessRequestStatus | 'all';
    dateRange:
        | 'all'
        | 'last-7-days'
        | 'last-30-days'
        | 'this-month'
        | 'this-year';
    organization: string;
};

export type AccessRequestMonitorSummary = {
    total: number;
    pending: number;
    approved: number;
    denied: number;
};

export type AccessReportExportFormat = 'pdf' | 'csv' | 'excel';

export type AccessReportExportDateRange =
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'this-year'
    | 'custom';

export type AccessReportExportOptions = {
    format: AccessReportExportFormat;
    dateRange: AccessReportExportDateRange;
    startDate?: string;
    endDate?: string;
    includeApproved: boolean;
    includePending: boolean;
    includeDenied: boolean;
    includeRequesterInfo: boolean;
    includeResearchInfo: boolean;
    includeAgencyInfo: boolean;
    includeDecisionDetails: boolean;
    includeAuditTrail: boolean;
    includeAgencySummary: boolean;
    includeStatusSummary: boolean;
    includeCurrentFilters: boolean;
};

export type AccessRequestOverridePayload = {
    reason: string;
    actor?: string;
};

export type AccessRequestAuditPayload = {
    actor?: string;
    notes?: string;
};

export type AccessRequestExportResult = {
    fileName: string;
    queuedAt: string;
    options: AccessReportExportOptions;
};
