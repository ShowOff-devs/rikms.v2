import { fetchApi } from '@/lib/api-client';
import { downloadResponseFile } from '@/lib/download-file';
import type {
    ActivityExportOptions,
    ActivityLog,
    ActivityLogFilters,
    ActivityTimelineItem,
    ClearNotificationsScope,
    GeneratedActivityExport,
    NotificationCategory,
    SystemNotification,
} from '@/types/system-activity';

type ApiNotification = {
    id: number;
    type: string;
    title: string;
    message: string;
    priority?: string;
    status?: string;
    read_at?: string | null;
    created_at?: string | null;
    data?: Record<string, unknown>;
};

type ApiAuditLog = {
    id: number;
    event: string;
    auditable_type?: string | null;
    auditable_id?: number | null;
    metadata?: Record<string, unknown>;
    user?: {
        name?: string | null;
        email?: string | null;
        role?: string | null;
        roles?: string[];
    } | null;
    agency?: {
        name?: string | null;
        short_name?: string | null;
    } | null;
    created_at?: string | null;
};

type MarkReadResponse = {
    notification: ApiNotification;
    unread_count: number;
};

type PaginationMeta = {
    pagination?: {
        current_page?: number;
        last_page?: number;
        per_page?: number;
        total?: number;
    };
    filter_options?: { agencies?: string[]; actions?: string[] };
};

export async function getUnreadSystemNotificationCount() {
    const response = await fetchApi<ApiNotification[], PaginationMeta>(
        '/api/admin/system-activity/notifications?status=unread&per_page=1',
    );

    return response.meta.pagination?.total ?? 0;
}

export async function getSystemNotifications() {
    const notifications: ApiNotification[] = [];
    let page = 1;
    let lastPage = 1;

    do {
        const response = await fetchApi<ApiNotification[], PaginationMeta>(
            `/api/admin/system-activity/notifications?per_page=100&page=${page}`,
        );
        notifications.push(...response.data);
        lastPage = response.meta.pagination?.last_page ?? 1;
        page += 1;
    } while (page <= lastPage);

    return notifications.map(toNotification);
}

export async function markNotificationAsRead(id: string) {
    const { data } = await fetchApi<MarkReadResponse>(
        `/api/admin/notifications/${id}/read`,
        { method: 'POST' },
    );

    return toNotification(data.notification);
}

export async function markAllSystemNotificationsAsRead() {
    await fetchApi('/api/admin/notifications/read-all', { method: 'POST' });
}

export async function clearSystemNotifications(
    scope: ClearNotificationsScope,
    category?: NotificationCategory,
) {
    const { data } = await fetchApi<{
        updated_count: number;
        cleared_at: string;
    }>('/api/admin/system-activity/notifications/clear', {
        method: 'POST',
        body: JSON.stringify({ scope, category }),
    });

    return {
        scope,
        category,
        clearedAt: data.cleared_at,
    };
}

export async function getActivityLogs(
    filters: ActivityLogFilters = {},
    page = 1,
    perPage = 8,
) {
    const params = new URLSearchParams();

    params.set('per_page', String(perPage));
    params.set('page', String(page));

    if (filters.query) {
        params.set('query', filters.query);
    }

    if (filters.agency && filters.agency !== 'all') {
        params.set('agency', filters.agency);
    }

    if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
    }

    if (filters.role && filters.role !== 'all') {
        params.set('role', filters.role);
    }

    if (filters.action && filters.action !== 'all') {
        params.set('action', filters.action);
    }

    const { data, meta } = await fetchApi<ApiAuditLog[], PaginationMeta>(
        `/api/admin/system-activity/logs?${params.toString()}`,
    );

    return {
        logs: data.map(toActivityLog),
        pagination: {
            currentPage: meta.pagination?.current_page ?? page,
            totalPages: meta.pagination?.last_page ?? 1,
            total: meta.pagination?.total ?? data.length,
        },
        filterOptions: {
            agencies: meta.filter_options?.agencies ?? [],
            actions: meta.filter_options?.actions ?? [],
        },
    };
}

export async function getActivityTimeline() {
    const { data } = await fetchApi<ApiAuditLog[]>(
        '/api/admin/system-activity/timeline?per_page=30',
    );

    return data.map(toTimelineItem);
}

export async function exportActivityLogs(
    options: ActivityExportOptions,
): Promise<GeneratedActivityExport> {
    const params = new URLSearchParams({
        format: options.format,
        date_range: options.dateRange,
        include_notifications: String(options.includeNotifications),
        include_activity_logs: String(options.includeActivityLogs),
        include_timeline: String(options.includeTimeline),
        include_security_events: String(options.includeSecurityEvents),
    });

    if (options.startDate) {
        params.set('start_date', options.startDate);
    }

    if (options.endDate) {
        params.set('end_date', options.endDate);
    }

    const response = await fetch(
        `/api/admin/system-activity/export?${params}`,
        {
            credentials: 'same-origin',
            headers: {
                Accept: 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) {
        throw new Error('Unable to export activity logs.');
    }

    const { fileName } = await downloadResponseFile(
        response,
        `rikms-activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
    );

    return {
        id: `activity-export-${Date.now()}`,
        fileName,
        format: options.format,
        generatedAt: new Date().toISOString(),
        status: 'ready',
    };
}

function toNotification(notification: ApiNotification): SystemNotification {
    return {
        id: String(notification.id),
        category: notificationCategory(notification.type),
        title: notification.title,
        message: notification.message,
        actor: String(notification.data?.actor ?? ''),
        agency: String(notification.data?.agency ?? ''),
        timestamp: notification.created_at ?? new Date().toISOString(),
        isRead: Boolean(notification.read_at || notification.status === 'read'),
        severity: notificationSeverity(notification.priority),
    };
}

function toActivityLog(log: ApiAuditLog): ActivityLog {
    return {
        id: String(log.id),
        timestamp: log.created_at ?? new Date().toISOString(),
        user: log.user?.name ?? log.user?.email ?? 'System',
        role: userRole(log.user),
        agency: log.agency?.short_name ?? log.agency?.name ?? undefined,
        action: log.event,
        affectedResource: affectedResource(log),
        status: activityStatus(log.event),
    };
}

function toTimelineItem(log: ApiAuditLog): ActivityTimelineItem {
    return {
        id: String(log.id),
        title: title(log.event),
        description: `${log.user?.name ?? 'System'} performed ${log.event}.`,
        timestamp: log.created_at ?? new Date().toISOString(),
        type: timelineType(log.event),
    };
}

function notificationCategory(type: string): NotificationCategory {
    if (type.includes('security')) {
        return 'security-alerts';
    }

    if (type.includes('access')) {
        return 'access-activity';
    }

    if (type.includes('research')) {
        return 'research-updates';
    }

    return 'system-updates';
}

function notificationSeverity(priority?: string) {
    if (priority === 'high' || priority === 'urgent') {
        return 'danger' as const;
    }

    if (priority === 'medium') {
        return 'warning' as const;
    }

    return 'info' as const;
}

function userRole(user: ApiAuditLog['user']): ActivityLog['role'] {
    const roles = user?.roles ?? [];

    if (user?.role === 'super_admin' || roles.includes('super_admin')) {
        return 'Super Admin';
    }

    if (user?.role === 'agency_admin' || roles.includes('agency_admin')) {
        return 'Agency Admin';
    }

    return user ? 'Unknown' : 'System';
}

function activityStatus(event: string): ActivityLog['status'] {
    if (event.includes('failed') || event.includes('error')) {
        return 'failed';
    }

    if (event.includes('pending')) {
        return 'pending';
    }

    return 'completed';
}

function timelineType(event: string): ActivityTimelineItem['type'] {
    if (event.includes('access') && event.includes('approved')) {
        return 'access-approved';
    }

    if (event.includes('login') && event.includes('failed')) {
        return 'failed-login';
    }

    if (event.includes('agency') && event.includes('created')) {
        return 'agency-created';
    }

    if (event.includes('agency_admin') && event.includes('created')) {
        return 'agency-admin-created';
    }

    if (event.includes('archived')) {
        return 'research-archived';
    }

    if (event.includes('metadata')) {
        return 'metadata-updated';
    }

    return 'research-uploaded';
}

function affectedResource(log: ApiAuditLog) {
    return (
        [log.auditable_type, log.auditable_id].filter(Boolean).join('#') ||
        'System record'
    );
}

function title(value: string) {
    return value
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}
