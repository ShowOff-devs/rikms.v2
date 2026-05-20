import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { ChartHeading } from '@/components/analytics/YearlyPublicationsChart';
import type { DownloadTrend } from '@/types/analytics';

export function DownloadActivityChart({
    data,
    onSelect,
}: {
    data: DownloadTrend[];
    onSelect: (title: string, description: string) => void;
}) {
    const max = Math.max(...data.map((item) => item.downloads), 0);
    const total = data.reduce((sum, item) => sum + item.downloads, 0);
    const chartWidth = 640;
    const chartHeight = 220;
    const padding = 28;
    const innerWidth = chartWidth - padding * 2;
    const innerHeight = chartHeight - padding * 2;
    const points = data.map((item, index) => {
        const x = padding + (index / Math.max(data.length - 1, 1)) * innerWidth;
        const y =
            padding +
            innerHeight -
            (max === 0 ? 0 : (item.downloads / max) * innerHeight);

        return { ...item, x, y };
    });
    const path = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
        )
        .join(' ');

    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <ChartHeading
                title="Research Download Activity"
                description="Monthly download trend for the current filter set."
            />

            {total === 0 ? (
                <AnalyticsEmptyState />
            ) : (
                <div className="mt-5 overflow-x-auto">
                    <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="h-[260px] min-w-[640px] rounded-[10px] bg-[#f9fafb]"
                        role="img"
                    >
                        {[0, 1, 2, 3].map((line) => {
                            const y = padding + (line / 3) * innerHeight;

                            return (
                                <line
                                    key={line}
                                    x1={padding}
                                    x2={chartWidth - padding}
                                    y1={y}
                                    y2={y}
                                    stroke="#e5e7eb"
                                />
                            );
                        })}
                        <path
                            d={path}
                            fill="none"
                            stroke="#1e3a8a"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {points.map((point) => (
                            <g key={point.month}>
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="5"
                                    fill="#ffffff"
                                    stroke="#1e3a8a"
                                    strokeWidth="3"
                                    className="cursor-pointer"
                                    onClick={() =>
                                        onSelect(
                                            `${point.month} Downloads`,
                                            `${point.downloads.toLocaleString()} downloads were recorded in ${point.month} for the current filter set.`,
                                        )
                                    }
                                />
                                <text
                                    x={point.x}
                                    y={chartHeight - 8}
                                    textAnchor="middle"
                                    className="fill-[#6a7282] text-[11px]"
                                >
                                    {point.month}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            )}
        </article>
    );
}
