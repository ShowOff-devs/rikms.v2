import {
    CheckCircle2,
    ClipboardList,
    Clock3,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AccessRequestMonitorSummary } from '@/types/access-request-monitor';

type AccessRequestStatsProps = {
    summary: AccessRequestMonitorSummary;
    isLoading: boolean;
};

const stats: Array<{
    key: keyof AccessRequestMonitorSummary;
    label: string;
    icon: LucideIcon;
    iconClassName: string;
    backgroundClassName: string;
}> = [
    {
        key: 'total',
        label: 'Total Access Requests',
        icon: ClipboardList,
        iconClassName: 'text-[#1e3a8a]',
        backgroundClassName: 'bg-[#eff6ff]',
    },
    {
        key: 'pending',
        label: 'Pending Requests',
        icon: Clock3,
        iconClassName: 'text-[#bb4d00]',
        backgroundClassName: 'bg-[#fff7ed]',
    },
    {
        key: 'approved',
        label: 'Approved Requests',
        icon: CheckCircle2,
        iconClassName: 'text-[#008236]',
        backgroundClassName: 'bg-[#f0fdf4]',
    },
    {
        key: 'denied',
        label: 'Denied Requests',
        icon: XCircle,
        iconClassName: 'text-[#c10007]',
        backgroundClassName: 'bg-[#fef2f2]',
    },
];

export function AccessRequestStats({
    summary,
    isLoading,
}: AccessRequestStatsProps) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                    <article
                        key={stat.key}
                        className="flex min-h-[88px] items-center gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={`flex size-11 shrink-0 items-center justify-center rounded-[12px] ${stat.backgroundClassName} ${stat.iconClassName}`}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            {isLoading ? (
                                <div className="h-8 w-12 rounded bg-[#f3f4f6]" />
                            ) : (
                                <p className="text-2xl leading-8 font-bold text-[#1e2939]">
                                    {summary[stat.key]}
                                </p>
                            )}
                            <p className="mt-0.5 truncate text-xs leading-4 font-medium text-[#6a7282]">
                                {stat.label}
                            </p>
                        </div>
                    </article>
                );
            })}
        </section>
    );
}
