import { BookOpen } from 'lucide-react';
import {
    ChartEmptyState,
    ChartSection,
    formatNumber,
} from '@/components/admin/analytics/chart-utils';
import type { ResearchByCategory } from '@/types/system-analytics';

function describeArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
        'M',
        start.x,
        start.y,
        'A',
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
    ].join(' ');
}

function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

export function ResearchByCategoryChart({
    data,
    isLoading,
}: {
    data: ResearchByCategory[];
    isLoading: boolean;
}) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const segments = data.reduce<
        Array<ResearchByCategory & { startAngle: number; endAngle: number }>
    >((items, item) => {
        const previous = items[items.length - 1];
        const startAngle = previous ? previous.endAngle : 0;
        const sweep = total === 0 ? 0 : (item.count / total) * 360;

        return [
            ...items,
            {
                ...item,
                startAngle,
                endAngle: startAngle + sweep,
            },
        ];
    }, []);

    return (
        <ChartSection
            title="Research by Category"
            description="Distribution of research across categories."
            icon={BookOpen}
            iconClassName="bg-[#faf5ff] text-[#7c3aed]"
        >
            <div className="min-h-[380px] p-5">
                {isLoading ? (
                    <div className="h-[300px] animate-pulse rounded-[10px] bg-[#f8fafc]" />
                ) : data.length === 0 ? (
                    <ChartEmptyState />
                ) : (
                    <div className="grid min-h-[300px] items-center gap-6 lg:grid-cols-[220px_1fr]">
                        <div className="relative mx-auto size-[220px]">
                            <svg viewBox="0 0 220 220" className="size-full">
                                {segments.map((item) => {
                                    const path = describeArc(
                                        110,
                                        110,
                                        70,
                                        item.startAngle,
                                        item.endAngle,
                                    );

                                    return (
                                        <path
                                            key={item.category}
                                            d={path}
                                            fill="none"
                                            stroke={item.color}
                                            strokeLinecap="butt"
                                            strokeWidth="34"
                                        >
                                            <title>
                                                {item.category}: {item.count}{' '}
                                                records
                                            </title>
                                        </path>
                                    );
                                })}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[24px] leading-8 font-bold text-[#1e2939]">
                                    {formatNumber(total)}
                                </span>
                                <span className="text-xs text-[#99a1af]">
                                    records
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                            {data.map((item) => {
                                const percentage =
                                    total === 0
                                        ? 0
                                        : Math.round(
                                              (item.count / total) * 100,
                                          );

                                return (
                                    <div
                                        key={item.category}
                                        className="flex min-w-0 items-center gap-2 text-xs leading-4"
                                    >
                                        <span
                                            className="size-2.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        <span className="min-w-0 flex-1 truncate text-[#4a5565]">
                                            {item.category}
                                        </span>
                                        <span className="font-semibold text-[#1e2939]">
                                            {formatNumber(item.count)}
                                        </span>
                                        <span className="text-[10px] text-[#99a1af]">
                                            ({percentage}%)
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </ChartSection>
    );
}
