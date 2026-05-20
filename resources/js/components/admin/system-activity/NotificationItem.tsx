import {
    Building2,
    CheckCircle2,
    Clock3,
    FileUp,
    ShieldAlert,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    NotificationCategory,
    NotificationSeverity,
    SystemNotification,
} from '@/types/system-activity';

const categoryIconMap = {
    'research-updates': FileUp,
    'access-activity': CheckCircle2,
    'security-alerts': ShieldAlert,
    'system-updates': Building2,
} satisfies Record<NotificationCategory, LucideIcon>;

const severityClasses = {
    info: 'bg-[#dbeafe] text-[#1e3a8a]',
    success: 'bg-[#dcfce7] text-[#16a34a]',
    warning: 'bg-[#fef3c7] text-[#d97706]',
    danger: 'bg-[#fee2e2] text-[#dc2626]',
} satisfies Record<NotificationSeverity, string>;

type NotificationItemProps = {
    notification: SystemNotification;
    onMarkAsRead: (id: string) => void;
};

export function NotificationItem({
    notification,
    onMarkAsRead,
}: NotificationItemProps) {
    const Icon =
        notification.title.toLowerCase().includes('admin account') ||
        notification.title.toLowerCase().includes('agency admin')
            ? UserPlus
            : categoryIconMap[notification.category];

    return (
        <article
            className={cn(
                'group grid min-h-[72px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b px-6 py-3 transition',
                notification.isRead
                    ? 'border-[#f9fafb] bg-white'
                    : 'border-[#1e3a8a] border-l-[3px] bg-[#eff6ff]/30 pl-[21px]',
            )}
        >
            <span
                className={cn(
                    'flex size-9 items-center justify-center rounded-[14px]',
                    severityClasses[notification.severity ?? 'info'],
                )}
            >
                <Icon className="size-4" aria-hidden="true" />
            </span>

            <div className="min-w-0">
                <p
                    className={cn(
                        'truncate text-sm leading-[22px] text-[#364153]',
                        notification.isRead ? 'font-normal' : 'font-semibold',
                    )}
                    title={notification.message}
                >
                    {notification.message}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-[16.5px] text-[#99a1af]">
                    <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {notification.timestamp}
                    </span>
                    {notification.actor && (
                        <span className="truncate">
                            Source: {notification.actor}
                        </span>
                    )}
                    {notification.agency && (
                        <span className="truncate">
                            Agency: {notification.agency}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!notification.isRead && (
                    <>
                        <button
                            type="button"
                            onClick={() => onMarkAsRead(notification.id)}
                            className="hidden text-xs font-medium text-[#1e3a8a] transition hover:text-[#172554] group-hover:inline"
                        >
                            Mark as read
                        </button>
                        <span
                            className="size-2.5 rounded-full bg-[#1e3a8a]"
                            aria-label="Unread notification"
                        />
                    </>
                )}
            </div>
        </article>
    );
}
