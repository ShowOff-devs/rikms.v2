import { CheckCircle2, Clock3, CopyCheck, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModerationSummary } from '@/types/research-moderation';

type SummaryCard = {
    key: keyof ModerationSummary;
    label: string;
    icon: LucideIcon;
    tone: string;
    iconColor: string;
};

const summaryCards: SummaryCard[] = [
    {
        key: 'flaggedResearchRecords',
        label: 'Flagged Research Records',
        icon: Flag,
        tone: 'bg-[#fff7ed] text-[#f54900]',
        iconColor: 'text-[#f54900]',
    },
    {
        key: 'pendingReview',
        label: 'Pending Review',
        icon: Clock3,
        tone: 'bg-[#fffbeb] text-[#f59e0b]',
        iconColor: 'text-[#f59e0b]',
    },
    {
        key: 'resolvedIssues',
        label: 'Resolved Issues',
        icon: CheckCircle2,
        tone: 'bg-[#f0fdf4] text-[#00a63e]',
        iconColor: 'text-[#00a63e]',
    },
    {
        key: 'duplicateResearchAlerts',
        label: 'Duplicate Research Alerts',
        icon: CopyCheck,
        tone: 'bg-[#f5f3ff] text-[#8b5cf6]',
        iconColor: 'text-[#8b5cf6]',
    },
];

export function ModerationSummaryCards({
    summary,
    isLoading,
}: {
    summary: ModerationSummary;
    isLoading: boolean;
}) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
                <article
                    key={card.key}
                    className="flex h-[86px] items-center gap-4 rounded-[14px] border border-[#e5e7eb] bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                >
                    <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] ${card.tone}`}
                    >
                        <card.icon
                            className={`size-5 ${card.iconColor}`}
                            aria-hidden="true"
                        />
                    </span>
                    <div className="min-w-0">
                        {isLoading ? (
                            <div className="h-6 w-10 rounded bg-[#f3f4f6]" />
                        ) : (
                            <p className="text-2xl leading-7 font-bold text-[#1e2939]">
                                {summary[card.key]}
                            </p>
                        )}
                        <p className="mt-1 truncate text-[11px] leading-4 text-[#6a7282]">
                            {card.label}
                        </p>
                    </div>
                </article>
            ))}
        </section>
    );
}
