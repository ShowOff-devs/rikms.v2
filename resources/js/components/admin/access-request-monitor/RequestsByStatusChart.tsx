import type { AccessRequestMonitorSummary } from '@/types/access-request-monitor';

type RequestsByStatusChartProps = {
    summary: AccessRequestMonitorSummary;
    isLoading: boolean;
};

const statusSegments = [
    {
        key: 'approved',
        label: 'Approved',
        color: '#008236',
        soft: 'bg-[#f0fdf4] text-[#008236]',
    },
    {
        key: 'pending',
        label: 'Pending',
        color: '#f59e0b',
        soft: 'bg-[#fffbeb] text-[#bb4d00]',
    },
    {
        key: 'denied',
        label: 'Denied',
        color: '#fb2c36',
        soft: 'bg-[#fef2f2] text-[#c10007]',
    },
] as const;

export function RequestsByStatusChart({
    summary,
    isLoading,
}: RequestsByStatusChartProps) {
    const total = Math.max(
        summary.approved + summary.pending + summary.denied,
        0,
    );
    let cursor = 0;
    const gradientStops = statusSegments
        .map((segment) => {
            const value = summary[segment.key];
            const start = cursor;
            const end = total === 0 ? cursor : cursor + (value / total) * 100;
            cursor = end;

            return `${segment.color} ${start}% ${end}%`;
        })
        .join(', ');
    const donutBackground =
        total === 0 ? '#e5e7eb' : `conic-gradient(${gradientStops})`;

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    Requests by Status
                </h2>
                <p className="mt-1 text-xs leading-4 text-[#99a1af]">
                    Overall status distribution of access requests.
                </p>
            </div>

            <div className="mt-6 flex min-h-[250px] flex-col items-center justify-center gap-6">
                {isLoading ? (
                    <div className="size-44 rounded-full bg-[#f3f4f6]" />
                ) : (
                    <>
                        <div
                            className="relative flex size-44 items-center justify-center rounded-full"
                            style={{ background: donutBackground }}
                            aria-label="Access request status distribution"
                        >
                            <div className="absolute size-24 rounded-full bg-white" />
                            <div className="relative text-center">
                                <p className="text-2xl font-bold text-[#1e2939]">
                                    {total}
                                </p>
                                <p className="text-[11px] font-medium text-[#99a1af]">
                                    Requests
                                </p>
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-3 gap-2">
                            {statusSegments.map((segment) => (
                                <div
                                    key={segment.key}
                                    className="rounded-[10px] border border-[#f3f4f6] bg-white p-3 text-center"
                                >
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#6a7282]">
                                        <span
                                            className="size-2 rounded-full"
                                            style={{
                                                backgroundColor: segment.color,
                                            }}
                                        />
                                        {segment.label}
                                    </div>
                                    <p className="mt-2 text-lg leading-7 font-bold text-[#1e2939]">
                                        {summary[segment.key]}
                                    </p>
                                    <p
                                        className={`mx-auto mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${segment.soft}`}
                                    >
                                        {segment.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
