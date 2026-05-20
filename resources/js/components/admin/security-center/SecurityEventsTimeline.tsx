import { Clock3 } from 'lucide-react';
import {
    severityStyles,
    toTitleCase,
} from '@/components/admin/security-center/security-center-display';
import { cn } from '@/lib/utils';
import type { SecurityEvent } from '@/types/security-center';

type SecurityEventsTimelineProps = {
    events: SecurityEvent[];
    isLoading: boolean;
};

export function SecurityEventsTimeline({
    events,
    isLoading,
}: SecurityEventsTimelineProps) {
    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex min-h-[65px] items-center gap-2.5 border-b border-[#f3f4f6] px-6 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f3f4f6] text-[#4a5565]">
                    <Clock3 className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    Security Event Timeline
                </h2>
            </div>

            <div>
                {isLoading ? (
                    Array.from({ length: 8 }, (_, index) => (
                        <div
                            key={index}
                            className="flex gap-4 border-b border-[#f9fafb] px-6 py-4 last:border-b-0"
                        >
                            <div className="mt-1 size-3 animate-pulse rounded-full bg-[#f3f4f6]" />
                            <div className="flex-1">
                                <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#f3f4f6]" />
                                <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-[#f3f4f6]" />
                            </div>
                        </div>
                    ))
                ) : events.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            No recent security events
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            Chronological audit-relevant security activity will
                            appear here.
                        </p>
                    </div>
                ) : (
                    events.map((event, index) => {
                        const severity = severityStyles[event.severity];

                        return (
                            <article
                                key={event.id}
                                className="relative flex gap-4 border-b border-[#f9fafb] px-6 py-4 last:border-b-0"
                            >
                                <div className="relative flex w-7 justify-center">
                                    <span
                                        className={cn(
                                            'mt-1 size-3 rounded-full border-2',
                                            severity.ring,
                                        )}
                                    />
                                    {index < events.length - 1 && (
                                        <span className="absolute top-5 bottom-[-17px] w-px bg-[#e5e7eb]" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm leading-5 font-medium text-[#364153]">
                                            {event.title}
                                        </h3>
                                        <span
                                            className={cn(
                                                'inline-flex h-[22px] items-center rounded-full border px-2 text-[10px] font-semibold',
                                                severity.badge,
                                            )}
                                        >
                                            {toTitleCase(event.severity)}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs leading-5 text-[#6a7282]">
                                        {event.description}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-[#99a1af]">
                                        {event.actor && (
                                            <span className="font-medium text-[#6a7282]">
                                                {event.actor}
                                            </span>
                                        )}
                                        <span>{event.timestamp}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </section>
    );
}
