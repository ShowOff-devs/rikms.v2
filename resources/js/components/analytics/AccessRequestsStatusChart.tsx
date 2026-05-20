import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { ChartHeading } from '@/components/analytics/YearlyPublicationsChart';
import type { AccessRequestBreakdown } from '@/types/analytics';

const statusStyles = {
    approved: {
        label: 'Approved',
        color: '#16a34a',
        bg: 'bg-[#f0fdf4]',
        text: 'text-[#008236]',
    },
    pending: {
        label: 'Pending',
        color: '#2563eb',
        bg: 'bg-[#eff6ff]',
        text: 'text-[#1447e6]',
    },
    denied: {
        label: 'Denied',
        color: '#dc2626',
        bg: 'bg-[#fef2f2]',
        text: 'text-[#e7000b]',
    },
};

export function AccessRequestsStatusChart({
    data,
    onSelect,
}: {
    data: AccessRequestBreakdown;
    onSelect: (title: string, description: string) => void;
}) {
    const entries = Object.entries(data) as Array<
        [keyof AccessRequestBreakdown, number]
    >;
    const total = entries.reduce((sum, [, value]) => sum + value, 0);

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading
                title="Access Requests by Status"
                description="Approval state of repository access requests."
            />

            {total === 0 ? (
                <AnalyticsEmptyState />
            ) : (
                <div className="mt-5 space-y-5">
                    <div className="flex h-4 overflow-hidden rounded-full bg-[#f3f4f6]">
                        {entries.map(([status, value]) => (
                            <button
                                key={status}
                                type="button"
                                title={`${statusStyles[status].label}: ${value}`}
                                onClick={() =>
                                    onSelect(
                                        `${statusStyles[status].label} Requests`,
                                        `${value.toLocaleString()} access request${value === 1 ? '' : 's'} are currently ${statusStyles[status].label.toLowerCase()}.`,
                                    )
                                }
                                className="h-full"
                                style={{
                                    width: `${(value / total) * 100}%`,
                                    backgroundColor: statusStyles[status].color,
                                }}
                            />
                        ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {entries.map(([status, value]) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() =>
                                    onSelect(
                                        `${statusStyles[status].label} Requests`,
                                        `${value.toLocaleString()} access request${value === 1 ? '' : 's'} are currently ${statusStyles[status].label.toLowerCase()}.`,
                                    )
                                }
                                className={`rounded-[12px] px-4 py-3 text-left ${statusStyles[status].bg}`}
                            >
                                <p
                                    className={`text-xs font-medium ${statusStyles[status].text}`}
                                >
                                    {statusStyles[status].label}
                                </p>
                                <p className="mt-2 text-2xl font-bold text-[#1e2939]">
                                    {value.toLocaleString()}
                                </p>
                                <p className="text-xs text-[#6a7282]">
                                    {Math.round((value / total) * 100)}% of
                                    requests
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
}
