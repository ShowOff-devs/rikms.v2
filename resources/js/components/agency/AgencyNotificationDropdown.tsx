import { Link } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    Bell,
    FileText,
    FileWarning,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAgencyNotifications } from '@/lib/notifications/notification-service';
import { cn } from '@/lib/utils';
import type {
    AgencyNotification,
    AgencyNotificationType,
} from '@/types/notifications';

const LATEST_NOTIFICATION_LIMIT = 5;

const notificationIcons: Record<AgencyNotificationType, LucideIcon> = {
    upload: FileText,
    'access-request': ShieldCheck,
    'revision-request': FileWarning,
    archive: Archive,
    analytics: BarChart3,
    settings: Settings,
};

function formatNotificationDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

export function AgencyNotificationDropdown() {
    const [notifications, setNotifications] = useState<AgencyNotification[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        getAgencyNotifications(LATEST_NOTIFICATION_LIMIT)
            .then((latestNotifications) => {
                if (!isCurrent) {
                    return;
                }

                setNotifications(
                    latestNotifications.slice(0, LATEST_NOTIFICATION_LIMIT),
                );
                setHasError(false);
            })
            .catch(() => {
                if (isCurrent) {
                    setHasError(true);
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

    const hasUnreadNotifications = notifications.some(
        (notification) => !notification.isRead,
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="relative flex size-9 items-center justify-center rounded-[10px] text-[#4a5565] transition hover:bg-[#f3f4f6] data-[state=open]:bg-[#f3f4f6]"
                    aria-label="Open latest notifications"
                    title="Notifications"
                >
                    <Bell className="size-5" aria-hidden="true" />
                    {hasUnreadNotifications ? (
                        <span className="absolute top-1.5 right-2 size-2 rounded-full bg-[#fb2c36] ring-2 ring-white" />
                    ) : null}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border-[#e5e7eb] bg-white p-0 shadow-xl"
            >
                <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                    <span className="font-semibold text-[#1e2939]">
                        Notifications
                    </span>
                    <span className="text-xs font-normal text-[#6a7282]">
                        Latest 5
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="m-0" />

                {isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-[#6a7282]">
                        Loading notifications...
                    </div>
                ) : hasError ? (
                    <div className="px-4 py-8 text-center text-sm text-[#6a7282]">
                        Notifications could not be loaded.
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[#6a7282]">
                        No notifications yet.
                    </div>
                ) : (
                    notifications.map((notification) => {
                        const NotificationIcon =
                            notificationIcons[notification.type];
                        const href =
                            notification.actionHref ?? '/agency/notifications';

                        return (
                            <DropdownMenuItem
                                key={notification.id}
                                asChild
                                className="rounded-none p-0 focus:bg-[#f9fafb]"
                            >
                                <Link
                                    href={href}
                                    className={cn(
                                        'flex w-full items-start gap-3 border-b border-[#f3f4f6] px-4 py-3',
                                        !notification.isRead && 'bg-[#f8faff]',
                                    )}
                                >
                                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#1e3a8a]">
                                        <NotificationIcon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start gap-2">
                                            <span
                                                className={cn(
                                                    'min-w-0 flex-1 truncate text-sm text-[#1e2939]',
                                                    notification.isRead
                                                        ? 'font-medium'
                                                        : 'font-semibold',
                                                )}
                                            >
                                                {notification.title}
                                            </span>
                                            {!notification.isRead ? (
                                                <span
                                                    className="mt-1.5 size-2 shrink-0 rounded-full bg-[#2563eb]"
                                                    aria-label="Unread"
                                                />
                                            ) : null}
                                        </span>
                                        <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-[#6a7282]">
                                            {notification.message}
                                        </span>
                                        <span className="mt-1 block text-[11px] text-[#99a1af]">
                                            {formatNotificationDate(
                                                notification.createdAt,
                                            )}
                                        </span>
                                    </span>
                                </Link>
                            </DropdownMenuItem>
                        );
                    })
                )}

                <DropdownMenuSeparator className="m-0" />
                <DropdownMenuItem
                    asChild
                    className="rounded-none p-0 focus:bg-[#f9fafb]"
                >
                    <Link
                        href="/agency/notifications"
                        className="flex w-full items-center justify-center px-4 py-3 text-sm font-semibold text-[#1e3a8a]"
                    >
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
