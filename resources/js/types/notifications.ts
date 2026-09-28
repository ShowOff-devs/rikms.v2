export type AgencyNotificationType =
    | 'upload'
    | 'access-request'
    | 'revision-request'
    | 'archive'
    | 'analytics'
    | 'settings';

export type AgencyNotification = {
    id: string;
    type: AgencyNotificationType;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
    actionHref?: string;
    actionLabel?: string;
    concernType?: string;
};

export type AgencyNotificationPagination = {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
};

export type AgencyNotificationCounts = {
    total: number;
    unread: number;
    actionable: number;
};

export type AgencyNotificationPage = {
    notifications: AgencyNotification[];
    pagination: AgencyNotificationPagination;
    counts: AgencyNotificationCounts;
};
