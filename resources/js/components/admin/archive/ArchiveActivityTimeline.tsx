import { Clock3 } from 'lucide-react';
import { archiveRecordTypeLabels } from '@/data/mock-admin-archive';
import { cn } from '@/lib/utils';
import type {
    ArchiveActivity,
    ArchiveActivityType,
} from '@/types/admin-archive';

type ArchiveActivityTimelineProps = {
    activities: ArchiveActivity[];
    isLoading: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
});

const activityStyles: Record<
    ArchiveActivityType,
    { label: string; badge: string; dot: string }
> = {
    'research-archived': {
        label: 'Archived',
        badge: 'border-[#e5e7eb] bg-[#f3f4f6] text-[#4a5565]',
        dot: 'bg-[#6a7282]',
    },
    'agency-archived': {
        label: 'Archived',
        badge: 'border-[#e5e7eb] bg-[#f3f4f6] text-[#4a5565]',
        dot: 'bg-[#6a7282]',
    },
    'user-archived': {
        label: 'Archived',
        badge: 'border-[#e5e7eb] bg-[#f3f4f6] text-[#4a5565]',
        dot: 'bg-[#6a7282]',
    },
    'record-restored': {
        label: 'Restored',
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        dot: 'bg-[#00c950]',
    },
    'record-permanently-deleted': {
        label: 'Deleted',
        badge: 'border-[#ffc9c9] bg-[#fef2f2] text-[#c10007]',
        dot: 'bg-[#fb2c36]',
    },
    'pending-deletion': {
        label: 'Pending',
        badge: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        dot: 'bg-[#fe9a00]',
    },
};

function formatTimestamp(value: string) {
    const date = new Date(value);

    return `${dateFormatter.format(date)} - ${timeFormatter.format(date)}`;
}

export function ArchiveActivityTimeline({
    activities,
    isLoading,
}: ArchiveActivityTimelineProps) {
    return (
        <section className="mt-6 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[65px] items-center justify-between border-b border-[#f3f4f6] px-6">
                <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1e3a8a]">
                        <Clock3 className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-semibold text-[#1e3a8a]">
                        Archive Activity Timeline
                    </h2>
                </div>

                <button
                    type="button"
                    className="text-xs font-medium text-[#1e3a8a] hover:text-[#172554]"
                >
                    View All Activity
                </button>
            </div>

            <div>
                {isLoading ? (
                    Array.from({ length: 6 }, (_, index) => (
                        <div
                            key={index}
                            className="flex h-[77px] items-center gap-5 border-b border-[#f3f4f6] px-6 last:border-b-0"
                        >
                            <div className="size-3 rounded-full bg-[#f3f4f6]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-40 rounded bg-[#f3f4f6]" />
                                <div className="h-3 w-64 rounded bg-[#f3f4f6]" />
                            </div>
                            <div className="h-3 w-32 rounded bg-[#f3f4f6]" />
                        </div>
                    ))
                ) : activities.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            No archive activity yet
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            Restore and permanent delete actions will appear
                            here.
                        </p>
                    </div>
                ) : (
                    activities.slice(0, 8).map((activity, index) => {
                        const styles = activityStyles[activity.type];

                        return (
                            <article
                                key={activity.id}
                                className="grid min-h-[77px] grid-cols-[28px_minmax(0,1fr)] gap-4 border-b border-[#f3f4f6] px-6 py-3 last:border-b-0 lg:grid-cols-[28px_minmax(0,1fr)_170px]"
                            >
                                <div className="relative flex justify-center">
                                    <span
                                        className={cn(
                                            'mt-[19px] size-3 rounded-full',
                                            styles.dot,
                                        )}
                                    />
                                    {index < activities.length - 1 ? (
                                        <span className="absolute top-[31px] bottom-[-12px] w-px bg-[#e5e7eb]" />
                                    ) : null}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={cn(
                                                'inline-flex h-[26px] items-center gap-2 rounded-full border px-2.5 text-[11px] font-semibold',
                                                styles.badge,
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'size-1.5 rounded-full',
                                                    styles.dot,
                                                )}
                                            />
                                            {styles.label}
                                        </span>
                                        <span className="inline-flex h-[19px] items-center rounded-[7px] bg-[#f9fafb] px-2 text-[11px] font-medium text-[#6a7282]">
                                            {
                                                archiveRecordTypeLabels[
                                                    activity.recordType
                                                ]
                                            }
                                        </span>
                                    </div>
                                    <p className="mt-1.5 truncate text-sm font-medium text-[#364153]">
                                        {activity.title}
                                    </p>
                                </div>

                                <div className="col-start-2 text-left lg:col-start-auto lg:text-right">
                                    <p className="text-xs font-medium text-[#4a5565]">
                                        {activity.performedBy}
                                    </p>
                                    <p className="mt-0.5 text-[11px] leading-4 text-[#99a1af]">
                                        {formatTimestamp(activity.timestamp)}
                                    </p>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </section>
    );
}
