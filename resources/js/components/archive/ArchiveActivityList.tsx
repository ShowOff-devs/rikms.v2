import { Archive, Clock3, RotateCcw, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ArchiveActivity, ArchiveActivityType } from '@/types/archive';

type ArchiveActivityListProps = {
    activities: ArchiveActivity[];
};

const activityStyles: Record<
    ArchiveActivityType,
    { icon: LucideIcon; className: string }
> = {
    'research-archived': {
        icon: Archive,
        className: 'bg-[#f3f4f6] text-[#6a7282]',
    },
    'research-restored': {
        icon: RotateCcw,
        className: 'bg-[#dcfce7] text-[#00a63e]',
    },
    'research-permanently-deleted': {
        icon: Trash2,
        className: 'bg-[#ffe2e2] text-[#fb2c36]',
    },
};

export function ArchiveActivityList({ activities }: ArchiveActivityListProps) {
    return (
        <section className="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-14 items-center gap-3 border-b border-[#f3f4f6] px-6">
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1e3a8a]">
                    <Archive className="size-4" />
                </span>
                <h2 className="text-sm leading-5 font-semibold text-[#1e3a8a]">
                    Archive Activity
                </h2>
            </div>

            <div>
                {activities.slice(0, 6).map((activity) => {
                    const Icon = activityStyles[activity.type].icon;

                    return (
                        <article
                            key={activity.id}
                            className="flex gap-3 border-b border-[#f3f4f6] px-6 py-3 last:border-b-0"
                        >
                            <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${
                                    activityStyles[activity.type].className
                                }`}
                            >
                                <Icon className="size-4" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm leading-5 font-medium text-[#364153]">
                                    {activity.title}
                                </p>
                                {activity.description ? (
                                    <p className="truncate text-xs leading-4 text-[#6a7282]">
                                        {activity.description}
                                    </p>
                                ) : null}
                            </div>

                            <div className="w-[150px] shrink-0 text-right">
                                <p className="inline-flex items-center justify-end gap-1 text-[11px] leading-[16.5px] text-[#99a1af]">
                                    <Clock3 className="size-3" />
                                    {activity.date} - {activity.time}
                                </p>
                                <p className="text-[11px] leading-[16.5px] text-[#99a1af]">
                                    {activity.performedBy}
                                </p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
