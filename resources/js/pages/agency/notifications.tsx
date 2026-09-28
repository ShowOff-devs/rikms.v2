import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    Bell,
    CheckCircle2,
    ChevronRight,
    FileText,
    FileWarning,
    Home,
    Search,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AccessRequestPagination } from '@/components/access-requests/AccessRequestPagination';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import {
    moderationIssueTypeLabels,
    normalizeModerationIssueType,
} from '@/data/research-moderation-options';
import { useAgencySession } from '@/lib/auth/agency-auth';
import {
    getAgencyNotificationsPage,
    markAllAgencyNotificationsRead,
    updateAgencyNotificationReadState,
} from '@/lib/notifications/notification-service';
import { cn } from '@/lib/utils';
import type {
    AgencyNotification,
    AgencyNotificationCounts,
    AgencyNotificationPagination,
    AgencyNotificationType,
} from '@/types/notifications';

type NotificationFilter = 'all' | 'unread' | AgencyNotificationType;

const filterOptions: Array<{ label: string; value: NotificationFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
    { label: 'Uploads', value: 'upload' },
    { label: 'Access Requests', value: 'access-request' },
    { label: 'Revisions', value: 'revision-request' },
    { label: 'Archive', value: 'archive' },
    { label: 'Analytics', value: 'analytics' },
    { label: 'Settings', value: 'settings' },
];

const notificationTypeDisplay: Record<
    AgencyNotificationType,
    { label: string; icon: LucideIcon; className: string }
> = {
    upload: {
        label: 'Upload',
        icon: FileText,
        className: 'bg-[#eff6ff] text-[#1e3a8a]',
    },
    'access-request': {
        label: 'Access Request',
        icon: ShieldCheck,
        className: 'bg-[#f0fdf4] text-[#008236]',
    },
    'revision-request': {
        label: 'Revision Request',
        icon: FileWarning,
        className: 'bg-[#fff7ed] text-[#c2410c]',
    },
    archive: {
        label: 'Archive',
        icon: Archive,
        className: 'bg-[#fff7ed] text-[#ca3500]',
    },
    analytics: {
        label: 'Analytics',
        icon: BarChart3,
        className: 'bg-[#f5f3ff] text-[#7c3aed]',
    },
    settings: {
        label: 'Settings',
        icon: Settings,
        className: 'bg-[#f8fafc] text-[#4a5565]',
    },
};

const formatNotificationDate = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));

const initialPagination: AgencyNotificationPagination = {
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
};

const initialCounts: AgencyNotificationCounts = {
    total: 0,
    unread: 0,
    actionable: 0,
};

export default function AgencyNotificationsPage() {
    const session = useAgencySession();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const [notifications, setNotifications] = useState<AgencyNotification[]>(
        [],
    );
    const [pagination, setPagination] =
        useState<AgencyNotificationPagination>(initialPagination);
    const [counts, setCounts] =
        useState<AgencyNotificationCounts>(initialCounts);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setIsLoading(true);
            setError('');
            setPage(1);
            setDebouncedSearch(search.trim());
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        let isCurrent = true;
        const controller = new AbortController();

        void getAgencyNotificationsPage({
            page,
            perPage: rowsPerPage,
            search: debouncedSearch,
            filter,
            signal: controller.signal,
        })
            .then((result) => {
                if (!isCurrent) {
                    return;
                }

                if (page > result.pagination.last_page) {
                    setPage(Math.max(1, result.pagination.last_page));

                    return;
                }

                setNotifications(result.notifications);
                setPagination(result.pagination);
                setCounts(result.counts);
                setIsLoading(false);
            })
            .catch((requestError: unknown) => {
                if (!isCurrent || isAbortError(requestError)) {
                    return;
                }

                setError(
                    'Notifications could not be loaded. Please try again.',
                );
                setIsLoading(false);
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [debouncedSearch, filter, page, reloadToken, rowsPerPage]);

    const handleReadToggle = async (notification: AgencyNotification) => {
        try {
            await updateAgencyNotificationReadState(
                notification.id,
                !notification.isRead,
            );
            setIsLoading(true);
            setError('');
            setReloadToken((current) => current + 1);
        } catch {
            setError(
                'The notification read state could not be updated. Please try again.',
            );
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAgencyNotificationsRead();
            setIsLoading(true);
            setError('');
            setPage(1);
            setReloadToken((current) => current + 1);
        } catch {
            setError(
                'Notifications could not be marked as read. Please try again.',
            );
        }
    };

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    return (
        <>
            <Head title="Agency Notifications" />
            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <main className="px-4 py-8 lg:px-[47px]">
                    <div className="mx-auto max-w-[1100px]">
                        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                            <div className="min-w-0">
                                <nav className="flex h-4 items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                                    <Link
                                        href="/agency/dashboard"
                                        className="inline-flex items-center gap-1 font-medium hover:text-[#1e3a8a]"
                                    >
                                        <Home className="size-3.5" />
                                        Dashboard
                                    </Link>
                                    <ChevronRight className="size-3" />
                                    <span className="font-medium text-[#1e3a8a]">
                                        Notifications
                                    </span>
                                </nav>
                                <h1 className="mt-2 text-2xl leading-9 font-bold text-[#1e3a8a]">
                                    Notifications
                                </h1>
                                <p className="text-sm leading-5 text-[#6a7282]">
                                    Review agency upload, repository, and access
                                    request updates.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={counts.unread === 0}
                                onClick={() => void handleMarkAllRead()}
                                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#99a1af]"
                            >
                                <CheckCircle2 className="size-4" />
                                Mark all read
                            </button>
                        </section>

                        <section className="mt-5 grid gap-3 sm:grid-cols-3">
                            <MetricCard label="Total" value={counts.total} />
                            <MetricCard label="Unread" value={counts.unread} />
                            <MetricCard
                                label="Actionable"
                                value={counts.actionable}
                            />
                        </section>

                        <section className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                                    <input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        className="h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                        placeholder="Search notifications..."
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {filterOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setIsLoading(true);
                                                setError('');
                                                setFilter(option.value);
                                                setPage(1);
                                            }}
                                            className={cn(
                                                'h-9 rounded-[10px] border px-3 text-xs font-semibold',
                                                filter === option.value
                                                    ? 'border-[#1e3a8a] bg-[#eff6ff] text-[#1e3a8a]'
                                                    : 'border-[#e5e7eb] bg-white text-[#6a7282] hover:text-[#1e3a8a]',
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="mt-5 space-y-3">
                            {isLoading ? (
                                Array.from({ length: 4 }, (_, index) => (
                                    <div
                                        key={index}
                                        className="h-[118px] animate-pulse rounded-[14px] bg-white"
                                    />
                                ))
                            ) : error ? (
                                <NotificationErrorState
                                    message={error}
                                    onRetry={() => {
                                        setIsLoading(true);
                                        setError('');
                                        setReloadToken(
                                            (current) => current + 1,
                                        );
                                    }}
                                />
                            ) : notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onReadToggle={() =>
                                            void handleReadToggle(notification)
                                        }
                                    />
                                ))
                            ) : (
                                <EmptyState />
                            )}
                        </section>

                        {!isLoading && !error && pagination.total > 0 ? (
                            <section className="mt-4 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
                                <AccessRequestPagination
                                    currentPage={pagination.current_page}
                                    totalPages={Math.max(
                                        1,
                                        pagination.last_page,
                                    )}
                                    rowsPerPage={rowsPerPage}
                                    totalItems={pagination.total}
                                    onPageChange={(nextPage) => {
                                        setIsLoading(true);
                                        setError('');
                                        setPage(
                                            Math.min(
                                                Math.max(nextPage, 1),
                                                Math.max(
                                                    1,
                                                    pagination.last_page,
                                                ),
                                            ),
                                        );
                                    }}
                                    onRowsPerPageChange={(nextRowsPerPage) => {
                                        setIsLoading(true);
                                        setError('');
                                        setRowsPerPage(nextRowsPerPage);
                                        setPage(1);
                                    }}
                                />
                            </section>
                        ) : null}
                    </div>
                </main>
            </AgencyAdminLayout>
        </>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <p className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                {value}
            </p>
            <p className="text-xs leading-4 text-[#6a7282]">{label}</p>
        </article>
    );
}

function NotificationItem({
    notification,
    onReadToggle,
}: {
    notification: AgencyNotification;
    onReadToggle: () => void;
}) {
    const display = notificationTypeDisplay[notification.type];
    const Icon = display.icon;

    return (
        <article
            className={cn(
                'rounded-[14px] border bg-white p-5 shadow-sm',
                notification.isRead
                    ? 'border-[#e5e7eb]'
                    : 'border-[#bfdbfe] ring-2 ring-[#1e3a8a]/5',
            )}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                        display.className,
                    )}
                >
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-bold text-[#4a5565]">
                            {display.label}
                        </span>
                        {!notification.isRead ? (
                            <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                                Unread
                            </span>
                        ) : null}
                        <span className="text-xs text-[#99a1af]">
                            {formatNotificationDate(notification.createdAt)}
                        </span>
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-[#101828]">
                        {notification.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6a7282]">
                        {notification.message}
                    </p>
                    {notification.concernType ? (
                        <p className="mt-2 text-xs font-semibold text-[#9a3412]">
                            Concern Type:{' '}
                            {
                                moderationIssueTypeLabels[
                                    normalizeModerationIssueType(
                                        notification.concernType,
                                    )
                                ]
                            }
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                    <button
                        type="button"
                        onClick={onReadToggle}
                        className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs font-semibold text-[#4a5565] hover:text-[#1e3a8a]"
                    >
                        {notification.isRead ? 'Mark unread' : 'Mark read'}
                    </button>
                    {notification.actionHref && notification.actionLabel ? (
                        <Link
                            href={notification.actionHref}
                            className="inline-flex h-9 items-center rounded-[10px] bg-[#1e3a8a] px-3 text-xs font-semibold text-white hover:bg-[#172f73]"
                        >
                            {notification.actionLabel}
                        </Link>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#d1d5dc] bg-white px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                <Bell className="size-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-[#101828]">
                No notifications found
            </h2>
            <p className="mt-1 max-w-[420px] text-sm leading-5 text-[#6a7282]">
                Try a different search term or notification filter.
            </p>
        </div>
    );
}

function NotificationErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div
            role="alert"
            className="flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-6 text-center"
        >
            <p className="text-sm font-semibold text-[#b91c1c]">{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-4 h-9 rounded-[10px] bg-[#1e3a8a] px-4 text-xs font-semibold text-white"
            >
                Try again
            </button>
        </div>
    );
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError';
}
