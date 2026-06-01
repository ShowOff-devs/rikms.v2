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

const notificationsStorageKey = 'rikms.agency.notifications.v1';

const seedNotifications: AgencyNotification[] = [
    {
        id: 'notif-access-sofia',
        type: 'access-request',
        title: 'New access request received',
        message:
            'Dr. Sofia Reyes requested access to a restricted water quality assessment record.',
        createdAt: '2026-05-19T09:20:00.000Z',
        isRead: false,
        actionHref: '/agency/access-requests',
        actionLabel: 'Review request',
    },
    {
        id: 'notif-upload-metadata',
        type: 'upload',
        title: 'AI metadata extraction completed',
        message:
            'Metadata suggestions are ready for the renewable microgrids terminal report draft.',
        createdAt: '2026-05-18T14:45:00.000Z',
        isRead: false,
        actionHref: '/agency/upload',
        actionLabel: 'Continue upload',
    },
    {
        id: 'notif-analytics-weekly',
        type: 'analytics',
        title: 'Weekly repository analytics ready',
        message:
            'Your agency research activity summary has been refreshed with the latest access and download trends.',
        createdAt: '2026-05-17T08:00:00.000Z',
        isRead: true,
        actionHref: '/agency/analytics',
        actionLabel: 'View analytics',
    },
    {
        id: 'notif-archive-restored',
        type: 'archive',
        title: 'Archived research restored',
        message:
            'A previously archived research record was restored to the active repository.',
        createdAt: '2026-05-16T16:30:00.000Z',
        isRead: true,
        actionHref: '/agency/archive',
        actionLabel: 'Open archive',
    },
    {
        id: 'notif-security-reminder',
        type: 'settings',
        title: 'Security settings reminder',
        message:
            'Review MFA and session timeout settings to keep the agency workspace protected.',
        createdAt: '2026-05-15T10:10:00.000Z',
        isRead: false,
        actionHref: '/agency/settings',
        actionLabel: 'Open settings',
    },
];

const mockNetworkDelay = (duration = 100) =>
    new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(undefined);

            return;
        }

        window.setTimeout(resolve, duration);
    });

const cloneNotification = (
    notification: AgencyNotification,
): AgencyNotification => ({
    ...notification,
});

function readStoredNotifications() {
    if (typeof window === 'undefined') {
        return null;
    }

    const stored = window.localStorage.getItem(notificationsStorageKey);

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored) as AgencyNotification[];
    } catch {
        window.localStorage.removeItem(notificationsStorageKey);

        return null;
    }
}

function writeStoredNotifications(notifications: AgencyNotification[]) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(
        notificationsStorageKey,
        JSON.stringify(notifications),
    );
}

export async function getAgencyNotifications() {
    try {
        const { data } = await fetchApi<NotificationApiRecord[]>(
            '/api/agency/notifications?per_page=50',
        );

        return data.map((notification) => ({
            id: String(notification.id),
            type: mapNotificationType(notification.type),
            title: notification.title,
            message: notification.message,
            createdAt: notification.created_at ?? new Date().toISOString(),
            isRead:
                Boolean(notification.read_at) || notification.status === 'read',
            actionHref: notification.action_url ?? undefined,
            actionLabel: notification.action_url ? 'Open' : undefined,
        }));
    } catch {
        await mockNetworkDelay();

        return (readStoredNotifications() ?? seedNotifications).map(
            cloneNotification,
        );
    }
}

export async function updateAgencyNotificationReadState(
    notificationId: string,
    isRead: boolean,
) {
    if (isRead) {
        try {
            await fetchApi<{
                notification: NotificationApiRecord;
                unread_count: number;
            }>(`/api/agency/notifications/${notificationId}/read`, {
                method: 'POST',
            });

            return getAgencyNotifications();
        } catch {
            // TODO Phase 6: Replace this mock fallback after notification mark-read browser flow is verified with real Sanctum authentication.
        }
    } else {
        // TODO Phase 6: Replace this mock fallback after a mark-unread API/flow is verified with real Sanctum authentication.
        try {
            const currentNotifications = await getAgencyNotifications();

            return currentNotifications.map((notification) =>
                notification.id === notificationId
                    ? { ...notification, isRead: false }
                    : notification,
            );
        } catch {
            // Continue to the retained local fallback below.
        }
    }

    await mockNetworkDelay(80);

    const nextNotifications = (
        readStoredNotifications() ?? seedNotifications
    ).map((notification) =>
        notification.id === notificationId
            ? { ...notification, isRead }
            : notification,
    );

    writeStoredNotifications(nextNotifications);

    return nextNotifications.map(cloneNotification);
}

export async function markAllAgencyNotificationsRead() {
    try {
        await fetchApi<{ updated_count: number; unread_count: number }>(
            '/api/agency/notifications/read-all',
            {
                method: 'POST',
            },
        );

        return getAgencyNotifications();
    } catch {
        // TODO Phase 6: Replace this mock fallback after notification read-all browser flow is verified with real Sanctum authentication.
    }

    await mockNetworkDelay(120);

    const nextNotifications = (
        readStoredNotifications() ?? seedNotifications
    ).map((notification) => ({
        ...notification,
        isRead: true,
    }));

    writeStoredNotifications(nextNotifications);

    return nextNotifications.map(cloneNotification);
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
