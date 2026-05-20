import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { ChartHeading } from '@/components/analytics/YearlyPublicationsChart';
import type { CategoryDistribution } from '@/types/analytics';

export function CategoryDistributionChart({
    data,
    onSelect,
}: {
    data: CategoryDistribution[];
    onSelect: (title: string, description: string) => void;
}) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const segments = data.reduce<
        Array<CategoryDistribution & { dash: number; offset: number }>
    >((items, item) => {
        const dash = total === 0 ? 0 : (item.count / total) * 100;
        const offset =
            items.length === 0
                ? 25
                : items[items.length - 1].offset + items[items.length - 1].dash;

        return [...items, { ...item, dash, offset }];
    }, []);

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading
                title="Research Distribution by Category"
                description="Repository share across agency research domains."
            />

            {data.length === 0 ? (
                <AnalyticsEmptyState />
            ) : (
                <div className="mt-5 grid items-center gap-5 sm:grid-cols-[200px_1fr]">
                    <div className="relative mx-auto size-[190px]">
                        <svg
                            viewBox="0 0 160 160"
                            className="size-full -rotate-90"
                        >
                            {segments.map((item) => (
                                <circle
                                    key={item.category}
                                    cx="80"
                                    cy="80"
                                    r="50"
                                    fill="none"
                                    stroke={item.color}
                                    strokeWidth="24"
                                    strokeDasharray={`${item.dash} ${100 - item.dash}`}
                                    strokeDashoffset={-item.offset}
                                    className="cursor-pointer transition-opacity hover:opacity-80"
                                    onClick={() =>
                                        onSelect(
                                            item.category,
                                            `${item.count} of ${total} filtered research record${total === 1 ? '' : 's'} belong to ${item.category}.`,
                                        )
                                    }
                                />
                            ))}
                            <circle cx="80" cy="80" r="33" fill="white" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-[#1e2939]">
                                {total}
                            </span>
                            <span className="text-xs text-[#6a7282]">
                                records
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {data.map((item) => (
                            <button
                                key={item.category}
                                type="button"
                                onClick={() =>
                                    onSelect(
                                        item.category,
                                        `${item.count} research record${item.count === 1 ? '' : 's'} matched this category.`,
                                    )
                                }
                                className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2 py-1.5 text-left hover:bg-[#f9fafb]"
                            >
                                <span className="flex min-w-0 items-center gap-2 text-sm text-[#4a5565]">
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="truncate">
                                        {item.category}
                                    </span>
                                </span>
                                <span className="text-sm font-semibold text-[#1e2939]">
                                    {item.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
}
