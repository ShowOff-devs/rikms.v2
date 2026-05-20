export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityAlertStatus = 'open' | 'acknowledged' | 'resolved';

export type LoginStatus = 'success' | 'failed';

export type AdminRole = 'Super Admin' | 'Agency Admin';

export type LoginActivityRole = AdminRole | 'Unknown';

export type SecuritySummary = {
    mfaEnabledAdminAccounts: number;
    mfaEligibleAdminAccounts: number;
    failedLoginAttempts: number;
    lockedAccounts: number;
    activeAdminSessions: number;
    securityAlerts: number;
};

export type SecurityAlert = {
    id: string;
    title: string;
    description: string;
    severity: SecuritySeverity;
    status: SecurityAlertStatus;
    timestamp: string;
    source?: string;
    affectedUser?: string;
    affectedResource?: string;
    sourceIp?: string;
    device?: string;
    recommendedAction?: string;
};

export type LoginActivity = {
    id: string;
    user: string;
    role: LoginActivityRole;
    ipAddress: string;
    location: string;
    device: string;
    browser?: string;
    loginTime: string;
    status: LoginStatus;
};

export type AdminSession = {
    id: string;
    user: string;
    role: AdminRole;
    device: string;
    ipAddress: string;
    lastActivity: string;
    status: 'active' | 'idle';
};

export type SecurityEvent = {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    severity: SecuritySeverity;
    actor?: string;
    type:
        | 'login-success'
        | 'login-failed'
        | 'account-locked'
        | 'password-reset'
        | 'rbac-updated'
        | 'admin-created'
        | 'policy-updated'
        | 'session-timeout-updated';
};

export type SecurityReportExportFormat = 'pdf' | 'csv' | 'excel';

export type SecurityReportDateRange =
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'custom';

export type SecurityReportExportOptions = {
    format: SecurityReportExportFormat;
    dateRange: SecurityReportDateRange;
    startDate?: string;
    endDate?: string;
    includeSummary: boolean;
    includeAlerts: boolean;
    includeLoginActivity: boolean;
    includeActiveSessions: boolean;
    includeSecurityEvents: boolean;
    includeFailedLogins: boolean;
    includePermissionChanges: boolean;
};

export type GeneratedSecurityReport = {
    id: string;
    fileName: string;
    format: SecurityReportExportFormat;
    generatedAt: string;
    status: 'ready';
};
