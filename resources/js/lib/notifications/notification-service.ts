import { fetchApi } from '@/lib/api-client';
import type { AgencyNotification } from '@/types/notifications';

type NotificationApiRecord = {
    id: number;
    type: string;
    title: string;
    message: string;
    status: string;
    read_at?: string | null;
    action_url?: string | null;
    created_at?: string | null;
};

export async function getAgencyNotifications() {
    const { data } = await fetchApi<NotificationApiRecord[]>(
        '/api/agency/notifications?per_page=50',
    );

    return data.map((notification) => ({
        id: String(notification.id),
        type: mapNotificationType(notification.type),
        title: notification.title,
        message: notification.message,
        createdAt: notification.created_at ?? new Date().toISOString(),
        isRead: Boolean(notification.read_at) || notification.status === 'read',
        actionHref: notification.action_url ?? undefined,
        actionLabel: notification.action_url ? 'Open' : undefined,
    }));
}

export async function updateAgencyNotificationReadState(
    notificationId: string,
    isRead: boolean,
) {
    if (isRead) {
        await fetchApi<{
            notification: NotificationApiRecord;
            unread_count: number;
        }>(`/api/agency/notifications/${notificationId}/read`, {
            method: 'POST',
        });

        return getAgencyNotifications();
    }

    throw new Error('Marking agency notifications as unread is not supported yet.');
}

export async function markAllAgencyNotificationsRead() {
    await fetchApi<{ updated_count: number; unread_count: number }>(
        '/api/agency/notifications/read-all',
        {
            method: 'POST',
        },
    );

    return getAgencyNotifications();
}

function mapNotificationType(type: string): AgencyNotification['type'] {
    if (
        type === 'upload' ||
        type === 'access-request' ||
        type === 'archive' ||
        type === 'analytics' ||
        type === 'settings'
    ) {
        return type;
    }

    return 'settings';
}
