import { Activity } from 'lucide-react';
import {
    axisTicks,
    buildPath,
    ChartEmptyState,
    ChartSection,
} from '@/components/admin/analytics/chart-utils';
import type { PlatformUsageActivity } from '@/types/system-analytics';

const series = [
    {
        key: 'repositoryViews',
        label: 'Research Views',
        color: '#1e3a8a',
    },
    {
        key: 'downloads',
        label: 'Downloads',
        color: '#16a34a',
    },
    {
        key: 'accessRequests',
        label: 'Access Requests',
        color: '#d97706',
    },
] as const;

export function PlatformUsageActivityChart({
    data,
    isLoading,
}: {
    data: PlatformUsageActivity[];
    isLoading: boolean;
}) {
    const width = 560;
    const height = 280;
    const max = Math.max(
        ...data.flatMap((item) => [
            item.repositoryViews,
            item.downloads,
            item.accessRequests,
        ]),
        0,
    );
    const ticks = axisTicks(max || 4, 4);
    const pointFor = (value: number, index: number) => {
        const step = data.length > 1 ? 480 / (data.length - 1) : 0;

        return {
            x: 60 + step * index,
            y: 16 + 198 * (1 - Math.min(value / Math.max(max, 1), 1)),
        };
    };

    return (
        <ChartSection
            title="Platform Usage Activity"
            description="Monthly views, downloads, and access requests."
            icon={Activity}
            iconClassName="bg-[#eef2ff] text-[#4f46e5]"
        >
            <div className="h-[320px] p-5">
                {isLoading ? (
                    <div className="h-full animate-pulse rounded-[10px] bg-[#f8fafc]" />
                ) : data.length === 0 ? (
                    <ChartEmptyState />
                ) : (
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-full w-full overflow-visible"
                        role="img"
                        aria-label="Monthly platform usage activity"
                    >
                        {ticks.map((tick, index) => {
                            const y = 16 + index * 52;

                            return (
                                <g key={tick}>
                                    <line
                                        x1="60"
                                        x2="540"
                                        y1={y}
                                        y2={y}
                                        stroke="#eef2f7"
                                        strokeDasharray="3 3"
                                    />
                                    <text
                                        x="42"
                                        y={y + 4}
                                        textAnchor="end"
                                        className="fill-[#9ca3af] text-[11px]"
                                    >
                                        {tick}
                                    </text>
                                </g>
                            );
                        })}

                        {series.map((item) => {
                            const points = data.map((datum, index) =>
                                pointFor(datum[item.key], index),
                            );

                            return (
                                <path
                                    key={item.key}
                                    d={buildPath(points)}
                                    fill="none"
                                    stroke={item.color}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.4"
                                />
                            );
                        })}

                        {data.map((item, index) => {
                            const x = pointFor(item.repositoryViews, index).x;

                            return (
                                <text
                                    key={item.month}
                                    x={x}
                                    y="248"
                                    textAnchor="middle"
                                    className="fill-[#9ca3af] text-[11px]"
                                >
                                    {item.month}
                                </text>
                            );
                        })}

                        <g transform="translate(138 266)">
                            {series.map((item, index) => (
                                <g
                                    key={item.key}
                                    transform={`translate(${index * 108} 0)`}
                                >
                                    <circle
                                        cx="0"
                                        cy="-4"
                                        r="4"
                                        fill={item.color}
                                    />
                                    <text
                                        x="8"
                                        y="0"
                                        className="fill-[#1e2939] text-[11px]"
                                    >
                                        {item.label}
                                    </text>
                                </g>
                            ))}
                        </g>
                    </svg>
                )}
            </div>
        </ChartSection>
    );
}
