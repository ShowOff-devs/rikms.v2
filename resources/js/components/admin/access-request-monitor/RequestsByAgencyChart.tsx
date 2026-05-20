type RequestsByAgencyDatum = {
    agency: string;
    count: number;
};

type RequestsByAgencyChartProps = {
    data: RequestsByAgencyDatum[];
    isLoading: boolean;
};

export function RequestsByAgencyChart({
    data,
    isLoading,
}: RequestsByAgencyChartProps) {
    const maxCount = Math.max(1, ...data.map((item) => item.count));

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    Requests by Agency
                </h2>
                <p className="mt-1 text-xs leading-4 text-[#99a1af]">
                    Distribution of access requests across agencies.
                </p>
            </div>

            <div className="mt-5 min-h-[250px]">
                {isLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: 8 }, (_, index) => (
                            <div
                                key={index}
                                className="h-4 rounded bg-[#f3f4f6]"
                            />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex h-[250px] items-center justify-center rounded-[12px] border border-dashed border-[#e5e7eb] text-sm text-[#99a1af]">
                        No agency data available
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {data.map((item) => (
                            <div
                                key={item.agency}
                                className="grid grid-cols-[76px_1fr_28px] items-center gap-3"
                            >
                                <span className="truncate text-[11px] text-[#6b7280]">
                                    {item.agency}
                                </span>
                                <div className="h-3 overflow-hidden rounded-full bg-[#eef2ff]">
                                    <div
                                        className="h-full rounded-full bg-[#1e3a8a]"
                                        style={{
                                            width: `${(item.count / maxCount) * 100}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-right text-[11px] font-semibold text-[#4a5565]">
                                    {item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
