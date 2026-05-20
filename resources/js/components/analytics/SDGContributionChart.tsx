import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { ChartHeading } from '@/components/analytics/YearlyPublicationsChart';
import type { SDGContribution } from '@/types/analytics';

export function SDGContributionChart({
    data,
    onSelect,
}: {
    data: SDGContribution[];
    onSelect: (title: string, description: string) => void;
}) {
    const max = Math.max(...data.map((item) => item.count), 0);

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading
                title="Research Contribution by SDG"
                description="Filtered research mapped to Sustainable Development Goals."
            />

            {data.length === 0 ? (
                <AnalyticsEmptyState />
            ) : (
                <div className="mt-5 max-h-[356px] space-y-4 overflow-y-auto pr-1">
                    {data.map((item) => {
                        const width = max === 0 ? 0 : (item.count / max) * 100;

                        return (
                            <button
                                key={item.sdg}
                                type="button"
                                onClick={() =>
                                    onSelect(
                                        item.sdg,
                                        `${item.count} filtered research record${item.count === 1 ? '' : 's'} contribute to ${item.label}.`,
                                    )
                                }
                                className="grid w-full gap-2 text-left"
                            >
                                <span className="flex items-center justify-between gap-3">
                                    <span className="min-w-0 text-sm font-medium text-[#1e2939]">
                                        {item.sdg}: {item.label}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold text-[#1e3a8a]">
                                        {item.count} / {item.percentage}%
                                    </span>
                                </span>
                                <span className="block h-2.5 overflow-hidden rounded-full bg-[#edf2f7]">
                                    <span
                                        className="block h-full rounded-full bg-[#2563eb]"
                                        style={{
                                            width: `${Math.max(width, 6)}%`,
                                        }}
                                    />
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </article>
    );
}
