import { Building2 } from 'lucide-react';
import {
    axisTicks,
    ChartEmptyState,
    ChartSection,
} from '@/components/admin/analytics/chart-utils';
import type { ResearchByAgency } from '@/types/system-analytics';

export function ResearchByAgencyChart({
    data,
    isLoading,
}: {
    data: ResearchByAgency[];
    isLoading: boolean;
}) {
    const width = 560;
    const height = 280;
    const max = Math.max(...data.map((item) => item.count), 0);
    const ticks = axisTicks(max || 4, 4);
    const chartTop = 22;
    const chartBottom = 212;
    const chartHeight = chartBottom - chartTop;
    const barAreaWidth = 470;
    const barWidth = Math.min(26, barAreaWidth / Math.max(data.length, 1) - 16);
    const step = data.length > 1 ? barAreaWidth / (data.length - 1) : 0;

    return (
        <ChartSection
            title="Research by Agency"
            description="Number of research records per agency."
            icon={Building2}
            iconClassName="bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]"
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
                        aria-label="Research records per agency"
                    >
                        {ticks.map((tick, index) => {
                            const y =
                                chartTop + (chartHeight / (ticks.length - 1)) * index;

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
                        {data.map((item, index) => {
                            const x = 72 + step * index;
                            const barHeight =
                                max === 0 ? 0 : (item.count / max) * chartHeight;
                            const y = chartBottom - barHeight;

                            return (
                                <g key={item.agency}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={Math.max(barHeight, 4)}
                                        rx="6"
                                        fill="#243f91"
                                    >
                                        <title>
                                            {item.agency}: {item.count} records
                                        </title>
                                    </rect>
                                    <text
                                        x={x + barWidth / 2}
                                        y="244"
                                        textAnchor="end"
                                        transform={`rotate(-35 ${x + barWidth / 2} 244)`}
                                        className="fill-[#6b7280] text-[10px]"
                                    >
                                        {item.agency}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                )}
            </div>
        </ChartSection>
    );
}
