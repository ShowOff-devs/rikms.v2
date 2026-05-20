import { Archive, Building2, RotateCcw, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminArchiveSummary } from '@/types/admin-archive';

type ArchiveSummaryCardsProps = {
    summary: AdminArchiveSummary | null;
    isLoading: boolean;
};

const cards: Array<{
    key: keyof AdminArchiveSummary;
    label: string;
    icon: LucideIcon;
    tone: string;
}> = [
    {
        key: 'archivedResearchRecords',
        label: 'Archived Research Records',
        icon: Archive,
        tone: 'bg-[#eff6ff] text-[#1e3a8a]',
    },
    {
        key: 'archivedAgencies',
        label: 'Archived Agencies',
        icon: Building2,
        tone: 'bg-[#fffbeb] text-[#bb4d00]',
    },
    {
        key: 'archivedUserAccounts',
        label: 'Archived User Accounts',
        icon: UsersRound,
        tone: 'bg-[#f0fdf4] text-[#008236]',
    },
    {
        key: 'recentlyRestored',
        label: 'Recently Restored',
        icon: RotateCcw,
        tone: 'bg-[#eef2ff] text-[#4338ca]',
    },
];

export function ArchiveSummaryCards({
    summary,
    isLoading,
}: ArchiveSummaryCardsProps) {
    return (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article
                        key={card.key}
                        className="flex h-[86px] items-center gap-4 rounded-[10px] border border-[#e5e7eb] bg-white px-5 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={`flex size-11 shrink-0 items-center justify-center rounded-[12px] ${card.tone}`}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            {isLoading || !summary ? (
                                <div className="h-7 w-14 animate-pulse rounded bg-[#f3f4f6]" />
                            ) : (
                                <p className="text-xl leading-7 font-bold text-[#0f172a]">
                                    {summary[card.key].toLocaleString()}
                                </p>
                            )}
                            <p className="truncate text-xs leading-4 font-medium text-[#6a7282]">
                                {card.label}
                            </p>
                        </div>
                    </article>
                );
            })}
        </section>
    );
}
