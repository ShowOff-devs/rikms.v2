export type NotificationCategory =
    | 'research-updates'
    | 'access-activity'
    | 'security-alerts'
    | 'system-updates';

export type NotificationTabValue = 'all' | NotificationCategory;

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export type SystemNotification = {
    id: string;
    category: NotificationCategory;
    title: string;
    message: string;
    actor?: string;
    agency?: string;
    timestamp: string;
    isRead: boolean;
    severity?: NotificationSeverity;
};

export type ActivityLogStatus = 'pending' | 'failed' | 'completed';

export type ActivityLogRole =
    | 'Super Admin'
    | 'Agency Admin'
    | 'System'
    | 'Unknown';

export type ActivityLog = {
    id: string;
    timestamp: string;
    user: string;
    role: ActivityLogRole;
    agency?: string;
    action: string;
    affectedResource: string;
    status: ActivityLogStatus;
};

export type ActivityTimelineType =
    | 'research-uploaded'
    | 'access-approved'
    | 'metadata-updated'
    | 'failed-login'
    | 'agency-admin-created'
    | 'research-archived'
    | 'agency-created';

export type ActivityTimelineItem = {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: ActivityTimelineType;
};

export type ActivityExportFormat = 'csv' | 'pdf' | 'excel';

export type ActivityExportDateRange =
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'custom';

export type ActivityExportOptions = {
    format: ActivityExportFormat;
    dateRange: ActivityExportDateRange;
    startDate?: string;
    endDate?: string;
    includeNotifications: boolean;
    includeActivityLogs: boolean;
    includeTimeline: boolean;
    includeSecurityEvents: boolean;
};

export type GeneratedActivityExport = {
    id: string;
    fileName: string;
    format: ActivityExportFormat;
    generatedAt: string;
    status: 'ready';
};

export type ClearNotificationsScope =
    | 'all'
    | 'read'
    | 'current-category';

export type ActivityLogFilters = {
    query?: string;
    status?: ActivityLogStatus | 'all';
    role?: ActivityLogRole | 'all';
    agency?: string;
    action?: string;
};
