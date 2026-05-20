import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ActivityLogTable } from '@/components/admin/system-activity/ActivityLogTable';
import { ActivityTimeline } from '@/components/admin/system-activity/ActivityTimeline';
import { ClearNotificationsModal } from '@/components/admin/system-activity/ClearNotificationsModal';
import { ExportActivityLogModal } from '@/components/admin/system-activity/ExportActivityLogModal';
import { SystemActivityHeader } from '@/components/admin/system-activity/SystemActivityHeader';
import { SystemNotificationsPanel } from '@/components/admin/system-activity/SystemNotificationsPanel';
import {
    clearSystemNotifications,
    exportActivityLogs,
    getActivityLogs,
    getActivityTimeline,
    getSystemNotifications,
    markNotificationAsRead,
} from '@/lib/admin/system-activity-service';
import type {
    ActivityExportOptions,
    ActivityLog,
    ActivityLogRole,
    ActivityLogStatus,
    ActivityTimelineItem,
    ClearNotificationsScope,
    NotificationTabValue,
    SystemNotification,
} from '@/types/system-activity';

const defaultRowsPerPage = 8;

function matchesActivitySearch(log: ActivityLog, query: string) {
    return [
        log.timestamp,
        log.user,
        log.role,
        log.agency,
        log.action,
        log.affectedResource,
        log.status,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
}

function uniqueSorted(values: Array<string | undefined>) {
    return Array.from(new Set(values.filter(Boolean) as string[])).sort(
        (left, right) => left.localeCompare(right),
    );
}

export function SystemActivityPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [notifications, setNotifications] = useState<SystemNotification[]>(
        [],
    );
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [timelineItems, setTimelineItems] = useState<ActivityTimelineItem[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] =
        useState<NotificationTabValue>('all');
    const [activitySearch, setActivitySearch] = useState('');
    const [selectedStatus, setSelectedStatus] =
        useState<ActivityLogStatus | 'all'>('all');
    const [selectedRole, setSelectedRole] =
        useState<ActivityLogRole | 'all'>('all');
    const [selectedAgency, setSelectedAgency] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(defaultRowsPerPage);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getSystemNotifications(),
            getActivityLogs(),
            getActivityTimeline(),
        ])
            .then(([loadedNotifications, loadedLogs, loadedTimeline]) => {
                if (!isCurrent) {
                    return;
                }

                setNotifications(loadedNotifications);
                setActivityLogs(loadedLogs);
                setTimelineItems(loadedTimeline);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load system activity data.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        activitySearch,
        selectedStatus,
        selectedRole,
        selectedAgency,
        selectedAction,
        rowsPerPage,
    ]);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setFeedback(null);
        }, 3200);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    const filteredNotifications = useMemo(() => {
        if (selectedCategory === 'all') {
            return notifications;
        }

        return notifications.filter(
            (notification) => notification.category === selectedCategory,
        );
    }, [notifications, selectedCategory]);

    const filteredActivityLogs = useMemo(() => {
        const query = activitySearch.trim().toLowerCase();

        return activityLogs.filter((log) => {
            const searchMatches = !query || matchesActivitySearch(log, query);
            const statusMatches =
                selectedStatus === 'all' || log.status === selectedStatus;
            const roleMatches =
                selectedRole === 'all' || log.role === selectedRole;
            const agencyMatches =
                selectedAgency === 'all' || log.agency === selectedAgency;
            const actionMatches =
                selectedAction === 'all' || log.action === selectedAction;

            return (
                searchMatches &&
                statusMatches &&
                roleMatches &&
                agencyMatches &&
                actionMatches
            );
        });
    }, [
        activityLogs,
        activitySearch,
        selectedStatus,
        selectedRole,
        selectedAgency,
        selectedAction,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredActivityLogs.length / rowsPerPage),
    );
    const paginatedActivityLogs = filteredActivityLogs.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
    );

    const agencies = useMemo(
        () => uniqueSorted(activityLogs.map((log) => log.agency)),
        [activityLogs],
    );
    const actions = useMemo(
        () => uniqueSorted(activityLogs.map((log) => log.action)),
        [activityLogs],
    );
    const readNotificationCount = useMemo(
        () =>
            notifications.filter((notification) => notification.isRead).length,
        [notifications],
    );

    const handleMarkAsRead = async (id: string) => {
        const updatedNotification = await markNotificationAsRead(id);

        setNotifications((currentNotifications) =>
            currentNotifications.map((notification) =>
                notification.id === id
                    ? { ...notification, isRead: updatedNotification.isRead }
                    : notification,
            ),
        );
    };

    const handleMarkAllAsRead = () => {
        setNotifications((currentNotifications) =>
            currentNotifications.map((notification) => ({
                ...notification,
                isRead: true,
            })),
        );
        setFeedback('All visible system notifications have been marked read.');
    };

    const handleResetActivityFilters = () => {
        setActivitySearch('');
        setSelectedStatus('all');
        setSelectedRole('all');
        setSelectedAgency('all');
        setSelectedAction('all');
    };

    const handleExport = async (options: ActivityExportOptions) => {
        setIsExporting(true);

        try {
            const exportResult = await exportActivityLogs(options);
            setFeedback(`${exportResult.fileName} is ready for download.`);
            setIsExportModalOpen(false);
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearNotifications = async (
        scope: ClearNotificationsScope,
    ) => {
        setIsClearing(true);

        try {
            await clearSystemNotifications(
                scope,
                selectedCategory === 'all' ? undefined : selectedCategory,
            );

            setNotifications((currentNotifications) => {
                if (scope === 'all') {
                    return [];
                }

                if (scope === 'read') {
                    return currentNotifications.filter(
                        (notification) => !notification.isRead,
                    );
                }

                if (selectedCategory === 'all') {
                    return [];
                }

                return currentNotifications.filter(
                    (notification) =>
                        notification.category !== selectedCategory,
                );
            });

            setFeedback(
                'System notifications were cleared. Activity logs remain available.',
            );
            setIsClearModalOpen(false);
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <SystemActivityHeader
                    onExport={() => setIsExportModalOpen(true)}
                    onClearNotifications={() => setIsClearModalOpen(true)}
                />

                {error && (
                    <div className="mt-6 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                        {error}
                    </div>
                )}

                {feedback && (
                    <div className="mt-6 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
                        {feedback}
                    </div>
                )}

                <SystemNotificationsPanel
                    notifications={notifications}
                    filteredNotifications={filteredNotifications}
                    selectedCategory={selectedCategory}
                    isLoading={isLoading}
                    onCategoryChange={setSelectedCategory}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                />

                <ActivityLogTable
                    logs={paginatedActivityLogs}
                    isLoading={isLoading}
                    searchQuery={activitySearch}
                    selectedStatus={selectedStatus}
                    selectedRole={selectedRole}
                    selectedAgency={selectedAgency}
                    selectedAction={selectedAction}
                    agencies={agencies}
                    actions={actions}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalResults={filteredActivityLogs.length}
                    rowsPerPage={rowsPerPage}
                    onSearchChange={setActivitySearch}
                    onStatusChange={setSelectedStatus}
                    onRoleChange={setSelectedRole}
                    onAgencyChange={setSelectedAgency}
                    onActionChange={setSelectedAction}
                    onResetFilters={handleResetActivityFilters}
                    onPageChange={(page) =>
                        setCurrentPage(Math.min(Math.max(page, 1), totalPages))
                    }
                />

                <ActivityTimeline items={timelineItems} isLoading={isLoading} />
            </main>

            <ExportActivityLogModal
                open={isExportModalOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportModalOpen}
                onExport={handleExport}
            />

            <ClearNotificationsModal
                open={isClearModalOpen}
                isClearing={isClearing}
                selectedCategory={selectedCategory}
                visibleCount={filteredNotifications.length}
                readCount={readNotificationCount}
                onOpenChange={setIsClearModalOpen}
                onConfirm={handleClearNotifications}
            />
        </AdminLayout>
    );
}
