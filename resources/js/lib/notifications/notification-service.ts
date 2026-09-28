import { fetchApi } from '@/lib/api-client';
import type {
    AgencyNotification,
    AgencyNotificationCounts,
    AgencyNotificationPage,
    AgencyNotificationPagination,
} from '@/types/notifications';

type NotificationApiRecord = {
    id: number;
    type: string;
    title: string;
    message: string;
    status: string;
    read_at?: string | null;
    action_url?: string | null;
    data?: {
        concern_type?: string | null;
        issue_type?: string | null;
        instructions?: string | null;
    } | null;
    created_at?: string | null;
};

type NotificationMeta = {
    pagination?: AgencyNotificationPagination;
    notification_counts?: AgencyNotificationCounts;
};

type NotificationPageOptions = {
    page?: number;
    perPage?: number;
    search?: string;
    filter?: string;
    signal?: AbortSignal;
};

export function agencyNotificationsPath({
    page = 1,
    perPage = 10,
    search = '',
    filter = 'all',
}: Omit<NotificationPageOptions, 'signal'> = {}) {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });
    const normalizedSearch = search.trim();

    if (normalizedSearch) {
        params.set('search', normalizedSearch);
    }

    if (filter === 'unread') {
        params.set('status', 'unread');
    } else if (filter !== 'all') {
        params.set('category', filter);
    }

    return `/api/agency/notifications?${params.toString()}`;
}

export async function getAgencyNotificationsPage(
    options: NotificationPageOptions = {},
): Promise<AgencyNotificationPage> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 10;
    const { data, meta } = await fetchApi<
        NotificationApiRecord[],
        NotificationMeta
    >(
        agencyNotificationsPath({
            page,
            perPage,
            search: options.search,
            filter: options.filter,
        }),
        { signal: options.signal },
    );

    const notifications = data.map(mapNotification);

    return {
        notifications,
        pagination: meta.pagination ?? {
            current_page: page,
            per_page: perPage,
            total: notifications.length,
            last_page: 1,
            from: notifications.length > 0 ? 1 : null,
            to: notifications.length || null,
        },
        counts: meta.notification_counts ?? {
            total: notifications.length,
            unread: notifications.filter((notification) => !notification.isRead)
                .length,
            actionable: notifications.filter((notification) =>
                Boolean(notification.actionHref),
            ).length,
        },
    };
}

export async function getAgencyNotifications(perPage = 50) {
    return (await getAgencyNotificationsPage({ perPage })).notifications;
}

function mapNotification(
    notification: NotificationApiRecord,
): AgencyNotification {
    return {
        id: String(notification.id),
        type: mapNotificationType(notification.type),
        title: notification.title,
        message: notification.message,
        createdAt: notification.created_at ?? new Date().toISOString(),
        isRead: Boolean(notification.read_at) || notification.status === 'read',
        actionHref: notification.action_url ?? undefined,
        actionLabel: notification.action_url
            ? notification.type === 'research.revision_requested'
                ? 'Review Revision'
                : 'Open'
            : undefined,
        concernType:
            notification.data?.concern_type ??
            notification.data?.issue_type ??
            undefined,
    };
}

export async function updateAgencyNotificationReadState(
    notificationId: string,
    isRead: boolean,
) {
    if (isRead) {
        return fetchApi<{
            notification: NotificationApiRecord;
            unread_count: number;
        }>(`/api/agency/notifications/${notificationId}/read`, {
            method: 'POST',
        });
    }

    return fetchApi<{
        notification: NotificationApiRecord;
        unread_count: number;
    }>(`/api/agency/notifications/${notificationId}/unread`, {
        method: 'POST',
    });
}

export async function markAllAgencyNotificationsRead() {
    return fetchApi<{ updated_count: number; unread_count: number }>(
        '/api/agency/notifications/read-all',
        {
            method: 'POST',
        },
    );
}

function mapNotificationType(type: string): AgencyNotification['type'] {
    if (
        type.startsWith('access_request.') ||
        type.startsWith('agency_access_request.')
    ) {
        return 'access-request';
    }

    if (
        type === 'research.revision_requested' ||
        type === 'research.rejected' ||
        type === 'research.returned'
    ) {
        return 'revision-request';
    }

    if (type === 'research.archived' || type === 'research.restored') {
        return 'archive';
    }

    if (
        type === 'research.created' ||
        type === 'research.submitted' ||
        type === 'research.approved' ||
        type === 'research.approved_published' ||
        type === 'research.published'
    ) {
        return 'upload';
    }

    if (type.startsWith('analytics.')) {
        return 'analytics';
    }

    if (type.startsWith('settings.')) {
        return 'settings';
    }

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
