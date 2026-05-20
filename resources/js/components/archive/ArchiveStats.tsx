import { Archive, RotateCcw, Undo2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ArchiveStatsProps = {
    totalArchived: number;
    recentlyArchived: number;
    restoredResearch: number;
};

const cards: Array<{
    key: keyof ArchiveStatsProps;
    label: string;
    icon: LucideIcon;
    iconClassName: string;
}> = [
    {
        key: 'totalArchived',
        label: 'Total Archived Research',
        icon: Archive,
        iconClassName: 'bg-[#f3f4f6] text-[#6a7282]',
    },
    {
        key: 'recentlyArchived',
        label: 'Recently Archived',
        icon: RotateCcw,
        iconClassName: 'bg-[#fef3c7] text-[#f59e0b]',
    },
    {
        key: 'restoredResearch',
        label: 'Restored Research',
        icon: Undo2,
        iconClassName: 'bg-[#dcfce7] text-[#00a63e]',
    },
];

export function ArchiveStats({
    totalArchived,
    recentlyArchived,
    restoredResearch,
}: ArchiveStatsProps) {
    const values = {
        totalArchived,
        recentlyArchived,
        restoredResearch,
    };

    return (
        <section className="grid gap-4 lg:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article
                        key={card.key}
                        className="flex h-[90px] items-center gap-4 rounded-[10px] border border-[#e5e7eb] bg-white px-5 shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={`flex size-12 shrink-0 items-center justify-center rounded-[10px] ${card.iconClassName}`}
                        >
                            <Icon className="size-6" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-2xl leading-8 font-bold text-[#1e2939]">
                                {values[card.key]}
                            </span>
                            <span className="block truncate text-xs leading-4 font-medium text-[#6a7282]">
                                {card.label}
                            </span>
                        </span>
                    </article>
                );
            })}
        </section>
    );
}
