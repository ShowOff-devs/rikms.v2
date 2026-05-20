import {
    Building2,
    Database,
    Download,
    Eye,
    FileText,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/components/admin/analytics/chart-utils';
import type { SystemAnalyticsMetric } from '@/types/system-analytics';

const metricIcons: Record<string, LucideIcon> = {
    database: Database,
    building: Building2,
    download: Download,
    eye: Eye,
    file: FileText,
    users: Users,
};

const metricIconStyles: Record<string, string> = {
    database: 'bg-[#dbeafe] text-[#1e3a8a]',
    building: 'bg-[#ede9fe] text-[#7c3aed]',
    download: 'bg-[#fef3c7] text-[#d97706]',
    eye: 'bg-[#dcfce7] text-[#16a34a]',
    file: 'bg-[#cffafe] text-[#0891b2]',
    users: 'bg-[#fff7ed] text-[#ea580c]',
};

export function AnalyticsMetricCards({
    metrics,
    isLoading,
}: {
    metrics: SystemAnalyticsMetric[];
    isLoading: boolean;
}) {
    if (isLoading) {
        return (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[146px] animate-pulse rounded-[14px] border border-[#e5e7eb] bg-white"
                    />
                ))}
            </section>
        );
    }

    return (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {metrics.map((metric) => {
                const icon = metric.icon ?? 'database';
                const Icon = metricIcons[icon] ?? Database;

                return (
                    <article
                        key={metric.id}
                        className="min-h-[146px] rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={`flex size-10 items-center justify-center rounded-[14px] ${
                                metricIconStyles[icon] ??
                                metricIconStyles.database
                            }`}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-[24px] leading-8 font-bold text-[#1e2939]">
                            {formatNumber(metric.value)}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-[16.5px] font-medium text-[#6a7282]">
                            {metric.label}
                        </p>
                    </article>
                );
            })}
        </section>
    );
}
