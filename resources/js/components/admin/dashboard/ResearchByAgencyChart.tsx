import type { ResearchByAgency } from '@/types/admin-dashboard';

export function ResearchByAgencyChart({
    data,
    isLoading,
}: {
    data: ResearchByAgency[];
    isLoading: boolean;
}) {
    const max = Math.max(...data.map((item) => item.count), 0);
    const yAxisTicks = [240, 180, 120, 60, 0];

    return (
        <article className="rounded-[10px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <ChartTitle
                title="Research by Agency"
                iconClassName="bg-[#eef2ff] text-[#243f91]"
            />

            {isLoading ? (
                <ChartSkeleton />
            ) : data.length === 0 ? (
                <EmptyChartState />
            ) : (
                <div className="mt-6 grid h-[240px] grid-cols-[36px_1fr] gap-2">
                    <div className="flex h-[208px] flex-col justify-between pt-0 text-right text-[10px] leading-3 text-[#99a1af]">
                        {yAxisTicks.map((tick) => (
                            <span key={tick}>{tick}</span>
                        ))}
                    </div>
                    <div className="relative h-[240px]">
                        <div className="absolute inset-x-0 top-0 h-[208px] border-b border-[#eef2f7]">
                            {yAxisTicks.slice(0, -1).map((tick, index) => (
                                <div
                                    key={tick}
                                    className="absolute inset-x-0 border-t border-dashed border-[#eef2f7]"
                                    style={{ top: `${index * 25}%` }}
                                />
                            ))}
                        </div>
                        <div className="absolute inset-x-0 top-0 flex h-[208px] items-end justify-between gap-3 px-2">
                            {data.map((item) => {
                                const height =
                                    max === 0
                                        ? 0
                                        : (item.count / 240) * 208;

                                return (
                                    <div
                                        key={item.agency}
                                        className="flex min-w-0 flex-1 flex-col items-center justify-end"
                                    >
                                        <div
                                            className="w-full max-w-[28px] rounded-t-[4px] bg-[#1e3a8a]"
                                            style={{
                                                height: `${Math.max(height, 6)}px`,
                                            }}
                                            title={`${item.count} research records`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex h-8 items-start justify-between gap-3 px-2 pt-2">
                            {data.map((item) => (
                                <span
                                    key={item.agency}
                                    className="-rotate-45 truncate text-[9px] leading-3 text-[#99a1af]"
                                    title={item.agency}
                                >
                                    {item.agency}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}

export function ChartTitle({
    title,
    iconClassName = 'bg-[#f3f4f6] text-[#4a5565]',
}: {
    title: string;
    iconClassName?: string;
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span
                className={`flex size-8 items-center justify-center rounded-[10px] ${iconClassName}`}
            >
                <svg
                    viewBox="0 0 20 20"
                    className="size-4"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M5 15V8M10 15V5M15 15v-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                    />
                    <path
                        d="M4 15.5h12"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                    />
                </svg>
            </span>
            <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                {title}
            </h2>
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="mt-6 h-[240px] animate-pulse rounded-[10px] bg-[#f1f5f9]">
        </div>
    );
}

export function EmptyChartState() {
    return (
        <div className="mt-6 flex h-[220px] items-center justify-center rounded-[10px] border border-dashed border-[#cbd5e1] text-sm text-[#64748b]">
            No dashboard data available.
        </div>
    );
}
