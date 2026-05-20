import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Download,
    Eye,
    FileText,
    ShieldCheck,
} from 'lucide-react';
import type { SummaryMetric, TrendDirection } from '@/types/analytics';

const metricIconMap = {
    'total-research': FileText,
    'total-downloads': Download,
    'total-views': Eye,
    'access-requests': ShieldCheck,
};

const metricToneMap = {
    'total-research': 'bg-[#eff6ff] text-[#1e3a8a]',
    'total-downloads': 'bg-[#ecfdf5] text-[#009966]',
    'total-views': 'bg-[#fff7ed] text-[#f97316]',
    'access-requests': 'bg-[#f5f3ff] text-[#7c3aed]',
};

export function SummaryMetricCards({ metrics }: { metrics: SummaryMetric[] }) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
                const Icon =
                    metricIconMap[metric.id as keyof typeof metricIconMap] ??
                    FileText;
                const tone =
                    metricToneMap[metric.id as keyof typeof metricToneMap] ??
                    metricToneMap['total-research'];

                return (
                    <article
                        key={metric.id}
                        className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <span
                                className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${tone}`}
                            >
                                <Icon className="size-5" />
                            </span>
                            <TrendPill
                                trend={metric.trend ?? 0}
                                direction={metric.trendDirection ?? 'neutral'}
                            />
                        </div>
                        <p className="mt-4 text-[26px] leading-8 font-bold text-[#1e2939]">
                            {metric.value.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                            {metric.label}
                        </p>
                    </article>
                );
            })}
        </section>
    );
}

function TrendPill({
    trend,
    direction,
}: {
    trend: number;
    direction: TrendDirection;
}) {
    const Icon =
        direction === 'up'
            ? ArrowUpRight
            : direction === 'down'
              ? ArrowDownRight
              : ArrowRight;
    const styles = {
        up: 'bg-[#f0fdf4] text-[#008236]',
        down: 'bg-[#fef2f2] text-[#e7000b]',
        neutral: 'bg-[#f8fafc] text-[#64748b]',
    };

    return (
        <span
            className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-semibold ${styles[direction]}`}
        >
            <Icon className="size-3.5" />
            {trend}%
        </span>
    );
}
