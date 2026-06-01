import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    FileUp,
    History,
    PencilLine,
    Radio,
} from 'lucide-react';
import type { SystemActivity } from '@/types/admin-dashboard';

const activityStyles = {
    upload: {
        icon: FileUp,
        className: 'bg-[#eff6ff] text-[#1e3a8a]',
    },
    publish: {
        icon: Radio,
        className: 'bg-[#ecfdf5] text-[#047857]',
    },
    'access-approved': {
        icon: CheckCircle2,
        className: 'bg-[#f0f9ff] text-[#0369a1]',
    },
    'metadata-updated': {
        icon: PencilLine,
        className: 'bg-[#fff7ed] text-[#c2410c]',
    },
    system: {
        icon: History,
        className: 'bg-[#f8fafc] text-[#475569]',
    },
};

function formatActivityTimestamp(timestamp: string) {
    const minutes = Math.max(
        1,
        Math.round((Date.now() - new Date(timestamp).getTime()) / 60000),
    );

    if (minutes < 60) {
        return `${minutes} minutes ago`;
    }

    return `${Math.round(minutes / 60)} hours ago`;
}

export function SystemActivityFeed({
    activities,
    isLoading,
}: {
    activities: SystemActivity[];
    isLoading: boolean;
}) {
    return (
        <article className="rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[65px] items-center justify-between gap-4 border-b border-[#f3f4f6] px-6">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#243f91]">
                        <History className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        System Activity Feed
                    </h2>
                </div>
                <Link
                    href="/admin/audit-logs"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a8a] hover:underline"
                >
                    View All
                    <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
            </div>

            <div className="divide-y divide-[#f1f5f9]">
                {isLoading ? (
                    Array.from({ length: 5 }, (_, index) => (
                        <div key={index} className="flex gap-3 px-6 py-3">
                            <div className="size-8 animate-pulse rounded-[10px] bg-[#e2e8f0]" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-4 w-3/4 animate-pulse rounded bg-[#e2e8f0]" />
                                <div className="h-3 w-1/3 animate-pulse rounded bg-[#e2e8f0]" />
                            </div>
                        </div>
                    ))
                ) : activities.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-[#64748b]">
                        No recent platform activity.
                    </div>
                ) : (
                    activities.map((activity) => {
                        const style = activityStyles[activity.type];
                        const Icon = style.icon;

                        return (
                            <div
                                key={activity.id}
                                className="flex gap-3 px-6 py-3.5"
                            >
                                <span
                                    className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] ${style.className}`}
                                >
                                    <Icon
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs leading-5 text-[#6a7282]">
                                        <span className="font-semibold text-[#0f172a]">
                                            {activity.actor}
                                        </span>{' '}
                                        {activity.action}{' '}
                                        <span className="font-semibold text-[#1e3a8a]">
                                            {activity.target}
                                        </span>
                                    </p>
                                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] leading-4 text-[#99a1af]">
                                        <span>
                                            {formatActivityTimestamp(
                                                activity.timestamp,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </article>
    );
}
