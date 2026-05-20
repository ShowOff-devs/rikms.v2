import {
    mockActivityLogs,
    mockActivityTimeline,
    mockSystemNotifications,
} from '@/data/mock-system-activity';
import type {
    ActivityExportOptions,
    ActivityLogFilters,
    ClearNotificationsScope,
    GeneratedActivityExport,
    NotificationCategory,
} from '@/types/system-activity';

const mockNetworkDelay = (duration = 220) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

function matchesQuery(value: string, query: string) {
    return value.toLowerCase().includes(query.toLowerCase());
}

export async function getSystemNotifications() {
    await mockNetworkDelay();

    return mockSystemNotifications.map((notification) => ({
        ...notification,
    }));
}

export async function markNotificationAsRead(id: string) {
    await mockNetworkDelay(140);

    const notification = mockSystemNotifications.find((item) => item.id === id);

    if (!notification) {
        throw new Error('System notification was not found.');
    }

    return {
        ...notification,
        isRead: true,
    };
}

export async function clearSystemNotifications(
    scope: ClearNotificationsScope,
    category?: NotificationCategory,
) {
    await mockNetworkDelay(260);

    return {
        scope,
        category,
        clearedAt: new Date().toISOString(),
    };
}

export async function getActivityLogs(filters: ActivityLogFilters = {}) {
    await mockNetworkDelay();

    const query = filters.query?.trim();

    return mockActivityLogs
        .filter((log) => {
            const queryMatches =
                !query ||
                matchesQuery(
                    [
                        log.timestamp,
                        log.user,
                        log.role,
                        log.agency,
                        log.action,
                        log.affectedResource,
                        log.status,
                    ]
                        .filter(Boolean)
                        .join(' '),
                    query,
                );
            const statusMatches =
                !filters.status ||
                filters.status === 'all' ||
                log.status === filters.status;
            const roleMatches =
                !filters.role ||
                filters.role === 'all' ||
                log.role === filters.role;
            const agencyMatches =
                !filters.agency ||
                filters.agency === 'all' ||
                log.agency === filters.agency;
            const actionMatches =
                !filters.action ||
                filters.action === 'all' ||
                log.action === filters.action;

            return (
                queryMatches &&
                statusMatches &&
                roleMatches &&
                agencyMatches &&
                actionMatches
            );
        })
        .map((log) => ({ ...log }));
}

export async function getActivityTimeline() {
    await mockNetworkDelay();

    return mockActivityTimeline.map((item) => ({ ...item }));
}

export async function exportActivityLogs(
    options: ActivityExportOptions,
): Promise<GeneratedActivityExport> {
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const extension = options.format === 'excel' ? 'xlsx' : options.format;

    return {
        id: `activity-export-${Date.now()}`,
        fileName: `rikms-activity-log-${generatedAt.slice(0, 10)}.${extension}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}
