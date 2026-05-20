import { BellRing } from 'lucide-react';
import { NotificationItem } from '@/components/admin/system-activity/NotificationItem';
import { NotificationTabs } from '@/components/admin/system-activity/NotificationTabs';
import type {
    NotificationTabValue,
    SystemNotification,
} from '@/types/system-activity';

type SystemNotificationsPanelProps = {
    notifications: SystemNotification[];
    filteredNotifications: SystemNotification[];
    selectedCategory: NotificationTabValue;
    isLoading: boolean;
    onCategoryChange: (category: NotificationTabValue) => void;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
};

export function SystemNotificationsPanel({
    notifications,
    filteredNotifications,
    selectedCategory,
    isLoading,
    onCategoryChange,
    onMarkAsRead,
    onMarkAllAsRead,
}: SystemNotificationsPanelProps) {
    const unreadCount = notifications.filter(
        (notification) => !notification.isRead,
    ).length;

    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[65px] items-center justify-between border-b border-[#f3f4f6] px-6">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-[14px] bg-[#1e3a8a]/10 text-[#1e3a8a]">
                        <BellRing className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        System Notifications
                    </h2>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-[#fb2c36] px-2 py-0.5 text-[10px] leading-[15px] font-bold text-white">
                            {unreadCount} new
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className="text-xs leading-4 font-medium text-[#1e3a8a] transition hover:text-[#172554] disabled:cursor-not-allowed disabled:text-[#99a1af]"
                >
                    Mark all as read
                </button>
            </div>

            <NotificationTabs
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
            />

            <div className="max-h-[420px] overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-3 p-6">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div
                                key={index}
                                className="h-[52px] rounded-[12px] bg-[#f3f4f6]"
                            />
                        ))}
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            No system notifications
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            Activity logs and audit timeline remain available
                            below.
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={onMarkAsRead}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
