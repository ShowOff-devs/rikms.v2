import type { AgencyNotification } from '@/types/notifications';

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
    await mockNetworkDelay();

    return (readStoredNotifications() ?? seedNotifications).map(
        cloneNotification,
    );
}

export async function updateAgencyNotificationReadState(
    notificationId: string,
    isRead: boolean,
) {
    await mockNetworkDelay(80);

    const nextNotifications = (readStoredNotifications() ?? seedNotifications).map(
        (notification) =>
            notification.id === notificationId
                ? { ...notification, isRead }
                : notification,
    );

    writeStoredNotifications(nextNotifications);

    return nextNotifications.map(cloneNotification);
}

export async function markAllAgencyNotificationsRead() {
    await mockNetworkDelay(120);

    const nextNotifications = (readStoredNotifications() ?? seedNotifications).map(
        (notification) => ({
            ...notification,
            isRead: true,
        }),
    );

    writeStoredNotifications(nextNotifications);

    return nextNotifications.map(cloneNotification);
}
