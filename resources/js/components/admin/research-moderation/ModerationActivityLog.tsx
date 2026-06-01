import {
    Archive,
    Check,
    CheckCircle2,
    CircleAlert,
    History,
    Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModerationActivity } from '@/types/research-moderation';

type ActivityStyle = {
    icon: LucideIcon;
    className: string;
};

const activityStyles: Record<ModerationActivity['type'], ActivityStyle> = {
    approved: {
        icon: CheckCircle2,
        className: 'bg-[#f0fdf4] text-[#00a63e]',
    },
    'revision-requested': {
        icon: Send,
        className: 'bg-[#fffbeb] text-[#f59e0b]',
    },
    'duplicate-resolved': {
        icon: Check,
        className: 'bg-[#eff6ff] text-[#2b7fff]',
    },
    archived: {
        icon: Archive,
        className: 'bg-[#f3f4f6] text-[#6a7282]',
    },
    'version-approved': {
        icon: CheckCircle2,
        className: 'bg-[#f0fdf4] text-[#00a63e]',
    },
    'issue-resolved': {
        icon: CircleAlert,
        className: 'bg-[#eff6ff] text-[#1e3a8a]',
    },
};

const activityDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

function formatTimestamp(value: string) {
    return activityDateFormatter.format(new Date(value));
}

export function ModerationActivityLog({
    activities,
    isLoading,
}: {
    activities: ModerationActivity[];
    isLoading: boolean;
}) {
    return (
        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#f3f4f6] px-6 py-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#1e3a8a]/10 text-[#1e3a8a]">
                        <History className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                            Moderation Activity Log
                        </h2>
                        <p className="text-xs leading-4 text-[#99a1af]">
                            Recent moderation actions performed by
                            administrators.
                        </p>
                    </div>
                </div>
                <a
                    href="/admin/audit-logs"
                    className="hidden text-xs font-semibold text-[#1e3a8a] hover:underline sm:inline"
                >
                    View All
                </a>
            </div>

            <div>
                {isLoading
                    ? Array.from({ length: 5 }, (_, index) => (
                          <div
                              key={index}
                              className="flex h-[61px] items-center gap-4 border-b border-[#f9fafb] px-6 last:border-b-0"
                          >
                              <div className="size-8 rounded-full bg-[#f3f4f6]" />
                              <div className="h-3 flex-1 rounded bg-[#f3f4f6]" />
                              <div className="h-3 w-32 rounded bg-[#f3f4f6]" />
                          </div>
                      ))
                    : activities.slice(0, 5).map((activity) => {
                          const style = activityStyles[activity.type];
                          const Icon = style.icon;

                          return (
                              <article
                                  key={activity.id}
                                  className="flex flex-col gap-2 border-b border-[#f9fafb] px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
                              >
                                  <span
                                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${style.className}`}
                                  >
                                      <Icon
                                          className="size-3.5"
                                          aria-hidden="true"
                                      />
                                  </span>
                                  <p className="min-w-0 flex-1 text-sm leading-5 text-[#99a1af]">
                                      <span className="font-semibold text-[#364153]">
                                          {activity.actor}
                                      </span>{' '}
                                      {activity.action}{' '}
                                      <span className="text-[#4a5565]">
                                          {activity.researchTitle}
                                      </span>
                                  </p>
                                  <time className="shrink-0 text-xs text-[#99a1af]">
                                      {formatTimestamp(activity.timestamp)}
                                  </time>
                              </article>
                          );
                      })}
            </div>
        </section>
    );
}
