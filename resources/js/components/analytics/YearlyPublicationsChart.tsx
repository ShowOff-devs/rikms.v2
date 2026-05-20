import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import type { YearlyPublication } from '@/types/analytics';

export function YearlyPublicationsChart({
    data,
    onSelect,
}: {
    data: YearlyPublication[];
    onSelect: (title: string, description: string) => void;
}) {
    const max = Math.max(...data.map((item) => item.count), 0);

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading
                title="Research Publications by Year"
                description="Annual research output submitted to the agency repository."
            />

            {data.length === 0 ? (
                <AnalyticsEmptyState />
            ) : (
                <div className="mt-5 flex h-[240px] items-end gap-3 border-b border-l border-[#e5e7eb] px-3 pt-3 sm:gap-5">
                    {data.map((item) => {
                        const height = max === 0 ? 0 : (item.count / max) * 176;

                        return (
                            <button
                                key={item.year}
                                type="button"
                                title={`${item.count} publications in ${item.year}`}
                                onClick={() =>
                                    onSelect(
                                        `${item.year} Publications`,
                                        `${item.count} research record${item.count === 1 ? '' : 's'} matched the current filters for ${item.year}.`,
                                    )
                                }
                                className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                            >
                                <span className="mb-2 text-xs font-semibold text-[#1e2939] opacity-0 transition group-hover:opacity-100">
                                    {item.count}
                                </span>
                                <span
                                    className="w-full max-w-[66px] rounded-t-[6px] bg-[#1e3a8a] transition group-hover:bg-[#2563eb]"
                                    style={{
                                        height: `${Math.max(height, 8)}px`,
                                    }}
                                />
                                <span className="mt-2 text-xs leading-4 text-[#6a7282]">
                                    {item.year}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </article>
    );
}

export function ChartHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                {title}
            </h2>
            <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                {description}
            </p>
        </div>
    );
}
