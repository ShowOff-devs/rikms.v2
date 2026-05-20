import { Eye, ShieldAlert } from 'lucide-react';
import {
    alertStatusStyles,
    severityStyles,
    toTitleCase,
} from '@/components/admin/security-center/security-center-display';
import { cn } from '@/lib/utils';
import type { SecurityAlert } from '@/types/security-center';

type SecurityAlertsPanelProps = {
    alerts: SecurityAlert[];
    isLoading: boolean;
    onViewDetails: (alert: SecurityAlert) => void;
    onAcknowledge: (id: string) => void;
    onResolve: (id: string) => void;
};

export function SecurityAlertsPanel({
    alerts,
    isLoading,
    onViewDetails,
    onAcknowledge,
    onResolve,
}: SecurityAlertsPanelProps) {
    const activeCount = alerts.filter(
        (alert) => alert.status === 'open',
    ).length;

    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex min-h-[65px] items-center justify-between gap-4 border-b border-[#f3f4f6] px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#fef2f2] text-[#e7000b]">
                        <ShieldAlert className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        Security Alerts
                    </h2>
                </div>

                <span className="inline-flex h-[24px] items-center rounded-full border border-[#ffc9c9] bg-[#fef2f2] px-2.5 text-[11px] font-semibold text-[#e7000b]">
                    {activeCount} Active
                </span>
            </div>

            <div>
                {isLoading ? (
                    Array.from({ length: 6 }, (_, index) => (
                        <div
                            key={index}
                            className="border-b border-[#f9fafb] px-6 py-4 last:border-b-0"
                        >
                            <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#f3f4f6]" />
                            <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#f3f4f6]" />
                        </div>
                    ))
                ) : alerts.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            No security alerts
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            Security monitoring alerts will appear here when
                            detected.
                        </p>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const severity = severityStyles[alert.severity];

                        return (
                            <article
                                key={alert.id}
                                className={cn(
                                    'flex flex-col gap-3 border-b border-[#f9fafb] px-6 py-4 last:border-b-0 lg:flex-row lg:items-start lg:justify-between',
                                    alert.status !== 'open' &&
                                        'bg-[#f9fafb]/50',
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={cn(
                                                'inline-flex h-[22px] items-center rounded-full border px-2 text-[10px] font-semibold',
                                                severity.badge,
                                            )}
                                        >
                                            {toTitleCase(alert.severity)}
                                        </span>
                                        <span
                                            className={cn(
                                                'inline-flex h-[22px] items-center rounded-full border px-2 text-[10px] font-semibold',
                                                alertStatusStyles[alert.status],
                                            )}
                                        >
                                            {toTitleCase(alert.status)}
                                        </span>
                                    </div>
                                    <h3 className="mt-2 text-sm leading-5 font-semibold text-[#1e2939]">
                                        {alert.title}
                                    </h3>
                                    <p className="mt-0.5 max-w-4xl text-xs leading-5 text-[#6a7282]">
                                        {alert.description}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-[#99a1af]">
                                        <span>{alert.timestamp}</span>
                                        {alert.source && (
                                            <span>{alert.source}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => onViewDetails(alert)}
                                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                                    >
                                        <Eye
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        View Details
                                    </button>
                                    {alert.status === 'open' ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onAcknowledge(alert.id)
                                            }
                                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#b9f8cf] bg-[#f0fdf4] px-3 text-xs font-medium text-[#008236] transition hover:bg-[#dcfce7]"
                                        >
                                            Acknowledge
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onResolve(alert.id)}
                                            disabled={
                                                alert.status === 'resolved'
                                            }
                                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Mark Resolved
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </section>
    );
}
