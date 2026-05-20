import { adminDashboardIcons } from '@/components/admin/dashboard/adminDashboardIcons';
import type { AdminDashboardMetric } from '@/types/admin-dashboard';

function formatMetricValue(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

export function AdminMetricCards({
    metrics,
    isLoading,
}: {
    metrics: AdminDashboardMetric[];
    isLoading: boolean;
}) {
    if (isLoading) {
        return (
            <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="h-24 animate-pulse rounded-[10px] border border-[#e5e7eb] bg-white"
                    />
                ))}
            </section>
        );
    }

    return (
        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {metrics.map((metric) => {
                const Icon = metric.icon
                    ? adminDashboardIcons[metric.icon]
                    : adminDashboardIcons.activity;

                return (
                    <article
                        key={metric.id}
                        className="min-h-24 rounded-[10px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                    >
                        <div>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#dbeafe] text-[#1e3a8a]">
                                <Icon className="size-4" aria-hidden="true" />
                            </span>
                        </div>
                        <p className="mt-3 text-[24px] leading-8 font-bold tracking-normal text-[#111827]">
                            {formatMetricValue(metric.value)}
                        </p>
                        <p className="text-xs leading-4 text-[#4a5565]">
                            {metric.label}
                        </p>
                        {metric.helperText && (
                            <p className="mt-0.5 text-[10px] leading-4 text-[#99a1af]">
                                {metric.helperText}
                            </p>
                        )}
                    </article>
                );
            })}
        </section>
    );
}
