import { Building2, CircleCheck, CircleX, Database } from 'lucide-react';

type AgencyStatsProps = {
    totalAgencies: number;
    activeAgencies: number;
    inactiveAgencies: number;
    totalResearchRecords: number;
};

const cards = [
    {
        key: 'totalAgencies',
        label: 'Total Agencies',
        icon: Building2,
        iconClassName: 'bg-[#dbeafe] text-[#1e3a8a]',
    },
    {
        key: 'activeAgencies',
        label: 'Active Agencies',
        icon: CircleCheck,
        iconClassName: 'bg-[#dcfce7] text-[#00a63e]',
    },
    {
        key: 'inactiveAgencies',
        label: 'Inactive Agencies',
        icon: CircleX,
        iconClassName: 'bg-[#f3f4f6] text-[#6a7282]',
    },
    {
        key: 'totalResearchRecords',
        label: 'Total Research Records',
        icon: Database,
        iconClassName: 'bg-[#f3e8ff] text-[#7c3aed]',
    },
] as const;

export function AgencyStats({
    totalAgencies,
    activeAgencies,
    inactiveAgencies,
    totalResearchRecords,
}: AgencyStatsProps) {
    const values = {
        totalAgencies,
        activeAgencies,
        inactiveAgencies,
        totalResearchRecords,
    };

    return (
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article
                        key={card.key}
                        className="flex min-h-[78px] items-center gap-4 rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${card.iconClassName}`}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span>
                            <span className="block text-[24px] leading-8 font-bold text-[#111827]">
                                {values[card.key].toLocaleString()}
                            </span>
                            <span className="block text-xs leading-4 text-[#4a5565]">
                                {card.label}
                            </span>
                        </span>
                    </article>
                );
            })}
        </section>
    );
}
