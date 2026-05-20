import { TrendingUp } from 'lucide-react';
import {
    axisTicks,
    buildPath,
    ChartEmptyState,
    chartPoints,
    ChartSection,
} from '@/components/admin/analytics/chart-utils';
import type { ResearchUploadTrend } from '@/types/system-analytics';

export function ResearchUploadTrendsChart({
    data,
    isLoading,
}: {
    data: ResearchUploadTrend[];
    isLoading: boolean;
}) {
    const width = 560;
    const height = 280;
    const values = data.map((item) => item.count);
    const max = Math.max(...values, 0);
    const ticks = axisTicks(max || 4, 4);
    const points = chartPoints(values, width, 230, 60, 16);
    const path = buildPath(points);
    const areaPath =
        points.length > 0
            ? `${path} L ${points[points.length - 1].x} 232 L ${points[0].x} 232 Z`
            : '';

    return (
        <ChartSection
            title="Research Upload Trends"
            description="Number of research uploads per year."
            icon={TrendingUp}
            iconClassName="bg-[#f0fdf4] text-[#16a34a]"
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
                        aria-label="Research uploads per year"
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
                        <defs>
                            <linearGradient
                                id="uploadTrendFill"
                                x1="0"
                                x2="0"
                                y1="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#1e3a8a"
                                    stopOpacity="0.18"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="#1e3a8a"
                                    stopOpacity="0"
                                />
                            </linearGradient>
                        </defs>
                        {areaPath && (
                            <path d={areaPath} fill="url(#uploadTrendFill)" />
                        )}
                        <path
                            d={path}
                            fill="none"
                            stroke="#1e3a8a"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                        />
                        {points.map((point, index) => (
                            <circle
                                key={data[index].year}
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#1e3a8a"
                            >
                                <title>
                                    {data[index].year}: {data[index].count}{' '}
                                    uploads
                                </title>
                            </circle>
                        ))}
                        {data.map((item, index) => (
                            <text
                                key={item.year}
                                x={points[index].x}
                                y="262"
                                textAnchor="middle"
                                className="fill-[#6b7280] text-[11px]"
                            >
                                {item.year}
                            </text>
                        ))}
                    </svg>
                )}
            </div>
        </ChartSection>
    );
}
