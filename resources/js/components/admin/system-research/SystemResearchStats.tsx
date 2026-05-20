import { BookOpen, Database, Eye, FileClock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SystemResearchSummary } from '@/types/system-research';

type StatCard = {
    label: string;
    value: number;
    icon: LucideIcon;
    iconClassName: string;
    iconWrapClassName: string;
};

const numberFormatter = new Intl.NumberFormat('en-US');

function SkeletonCard() {
    return (
        <div className="h-[86px] rounded-[10px] border border-[#e5e7eb] bg-white p-[21px] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-4">
                <div className="size-11 animate-pulse rounded-[10px] bg-[#eef2f7]" />
                <div className="space-y-2">
                    <div className="h-5 w-16 animate-pulse rounded bg-[#eef2f7]" />
                    <div className="h-3 w-24 animate-pulse rounded bg-[#eef2f7]" />
                </div>
            </div>
        </div>
    );
}

export function SystemResearchStats({
    summary,
    isLoading,
}: {
    summary: SystemResearchSummary;
    isLoading: boolean;
}) {
    const cards: StatCard[] = [
        {
            label: 'Total Records',
            value: summary.totalRecords,
            icon: Database,
            iconClassName: 'text-[#2563eb]',
            iconWrapClassName: 'bg-[#dbeafe]',
        },
        {
            label: 'Published',
            value: summary.published,
            icon: BookOpen,
            iconClassName: 'text-[#16a34a]',
            iconWrapClassName: 'bg-[#dcfce7]',
        },
        {
            label: 'Under Review',
            value: summary.underReview,
            icon: FileClock,
            iconClassName: 'text-[#d97706]',
            iconWrapClassName: 'bg-[#fef3c7]',
        },
        {
            label: 'Total Views',
            value: summary.totalViews,
            icon: Eye,
            iconClassName: 'text-[#7c3aed]',
            iconWrapClassName: 'bg-[#ede9fe]',
        },
    ];

    if (isLoading) {
        return (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <SkeletonCard key={card.label} />
                ))}
            </section>
        );
    }

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="h-[86px] rounded-[10px] border border-[#e5e7eb] bg-white p-[21px] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                >
                    <div className="flex items-center gap-4">
                        <span
                            className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] ${card.iconWrapClassName}`}
                        >
                            <card.icon
                                className={`size-5 ${card.iconClassName}`}
                                aria-hidden="true"
                            />
                        </span>
                        <span>
                            <span className="block text-xl leading-7 font-bold text-[#1e2939]">
                                {numberFormatter.format(card.value)}
                            </span>
                            <span className="block text-xs leading-4 font-medium text-[#6a7282]">
                                {card.label}
                            </span>
                        </span>
                    </div>
                </div>
            ))}
        </section>
    );
}
