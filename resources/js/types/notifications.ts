export type AgencyNotificationType =
    | 'upload'
    | 'access-request'
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
};
