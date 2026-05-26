import {
    Archive,
    Building2,
    CheckCircle2,
    Clock3,
    FileUp,
    PencilLine,
    ShieldAlert,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    ActivityTimelineItem,
    ActivityTimelineType,
} from '@/types/system-activity';

type ActivityTimelineProps = {
    items: ActivityTimelineItem[];
    isLoading: boolean;
};

const timelineStyle = {
    'research-uploaded': {
        color: 'bg-[#1e3a8a]',
        icon: FileUp,
    },
    'access-approved': {
        color: 'bg-[#16a34a]',
        icon: CheckCircle2,
    },
    'metadata-updated': {
        color: 'bg-[#d97706]',
        icon: PencilLine,
    },
    'failed-login': {
        color: 'bg-[#dc2626]',
        icon: ShieldAlert,
    },
    'agency-admin-created': {
        color: 'bg-[#0891b2]',
        icon: UserPlus,
    },
    'research-archived': {
        color: 'bg-[#6b7280]',
        icon: Archive,
    },
    'agency-created': {
        color: 'bg-[#7c3aed]',
        icon: Building2,
    },
} satisfies Record<ActivityTimelineType, { color: string; icon: LucideIcon }>;

export function ActivityTimeline({ items, isLoading }: ActivityTimelineProps) {
    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[69px] items-center gap-2.5 border-b border-[#f3f4f6] px-6">
                <span className="flex size-8 items-center justify-center rounded-[14px] bg-[#eef2ff] text-[#4f46e5]">
                    <Clock3 className="size-4" aria-hidden="true" />
                </span>
                <div>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        Activity Timeline
                    </h2>
                    <p className="text-xs leading-4 text-[#99a1af]">
                        Recent system events visualized chronologically.
                    </p>
                </div>
            </div>

            <div className="px-6 py-6">
                {isLoading ? (
                    <div className="space-y-5">
                        {Array.from({ length: 5 }, (_, index) => (
                            <div
                                key={index}
                                className="h-[72px] rounded-[14px] bg-[#f3f4f6]"
                            />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            No timeline events
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            Recent system events will appear here in
                            chronological order.
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="absolute top-3 bottom-3 left-[11px] w-px bg-[#e5e7eb]" />
                        <div className="space-y-5">
                            {items.map((item) => {
                                const style = timelineStyle[item.type];
                                const Icon = style.icon;

                                return (
                                    <article
                                        key={item.id}
                                        className="relative pl-12"
                                    >
                                        <span
                                            className={cn(
                                                'absolute top-1 left-0 z-10 flex size-[22px] items-center justify-center rounded-full border-2 border-white text-white',
                                                style.color,
                                            )}
                                        >
                                            <Icon
                                                className="size-3"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="rounded-[14px] bg-[#f9fafb] px-4 py-4">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <h3 className="text-sm leading-5 font-semibold text-[#1e2939]">
                                                    {item.title}
                                                </h3>
                                                <span className="inline-flex items-center gap-1 text-[11px] leading-[16.5px] text-[#99a1af]">
                                                    <Clock3
                                                        className="size-3"
                                                        aria-hidden="true"
                                                    />
                                                    {item.timestamp}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                                                {item.description}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
