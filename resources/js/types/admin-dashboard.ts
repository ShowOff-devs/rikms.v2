export type AdminDashboardIcon =
    | 'activity'
    | 'archive'
    | 'bar-chart'
    | 'bell'
    | 'building'
    | 'clipboard'
    | 'file-text'
    | 'lock'
    | 'shield'
    | 'users';

export type AdminDashboardMetric = {
    id: string;
    label: string;
    value: number;
    helperText?: string;
    icon?: AdminDashboardIcon;
    trend?: number;
};

export type ResearchByAgency = {
    agency: string;
    count: number;
    color?: string;
};

export type ResearchUploadByYear = {
    year: number;
    count: number;
};

export type SystemActivity = {
    id: string;
    actor: string;
    agency?: string;
    action: string;
    target: string;
    timestamp: string;
    type:
        | 'upload'
        | 'publish'
        | 'access-approved'
        | 'metadata-updated'
        | 'system';
};

export type ModerationIssueType =
    | 'duplicate-research'
    | 'missing-metadata'
    | 'pending-access'
    | 'incomplete-affiliation';

export type ModerationItem = {
    id: string;
    title: string;
    agency: string;
    issueType: ModerationIssueType;
    severity: 'low' | 'medium' | 'high';
    statusLabel: string;
};

export type SecurityStatus = {
    mfaEnabledAccounts: number;
    mfaEligibleAccounts?: number;
    recentFailedLogins: number;
    lockedAccounts: number;
    securityAlerts: number;
};

export type QuickManagementAction = {
    id: string;
    label: string;
    route: string;
    icon?: AdminDashboardIcon;
    description?: string;
};

export type GeneratedSystemReport = {
    id: string;
    fileName: string;
    format: 'pdf' | 'csv';
    generatedAt: string;
    status: 'ready';
};
