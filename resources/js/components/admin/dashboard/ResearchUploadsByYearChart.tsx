import {
    ChartSkeleton,
    ChartTitle,
    EmptyChartState,
} from '@/components/admin/dashboard/ResearchByAgencyChart';
import type { ResearchUploadByYear } from '@/types/admin-dashboard';

export function ResearchUploadsByYearChart({
    data,
    isLoading,
}: {
    data: ResearchUploadByYear[];
    isLoading: boolean;
}) {
    const width = 480;
    const height = 208;
    const yMax = 320;
    const yAxisTicks = [320, 240, 160, 80, 0];
    const points = data.map((item, index) => {
        const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * width;
        const y = height - (item.count / yMax) * height;

        return { ...item, x, y };
    });
    const pathData = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
        )
        .join(' ');

    return (
        <article className="rounded-[10px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <ChartTitle
                title="Research Uploads by Year"
                iconClassName="bg-[#dcfce7] text-[#16a34a]"
            />

            {isLoading ? (
                <ChartSkeleton />
            ) : data.length === 0 ? (
                <EmptyChartState />
            ) : (
                <div className="mt-6 grid h-[240px] grid-cols-[36px_1fr] gap-2">
                    <div className="flex h-[208px] flex-col justify-between text-right text-[10px] leading-3 text-[#99a1af]">
                        {yAxisTicks.map((tick) => (
                            <span key={tick}>{tick}</span>
                        ))}
                    </div>
                    <div className="relative h-[240px]">
                        <svg
                            viewBox={`0 0 ${width} 240`}
                            preserveAspectRatio="none"
                            className="absolute inset-0 size-full overflow-visible"
                            aria-label="Research uploads by year"
                        >
                            {yAxisTicks.slice(0, -1).map((tick) => (
                                <line
                                    key={tick}
                                    x1="0"
                                    x2={width}
                                    y1={height - (tick / yMax) * height}
                                    y2={height - (tick / yMax) * height}
                                    stroke="#eef2f7"
                                    strokeDasharray="4 4"
                                />
                            ))}
                            {points.map((point) => (
                                <line
                                    key={`v-${point.year}`}
                                    x1={point.x}
                                    x2={point.x}
                                    y1="0"
                                    y2={height}
                                    stroke="#f1f5f9"
                                    strokeDasharray="4 4"
                                />
                            ))}
                            <path
                                d={pathData}
                                fill="none"
                                stroke="#16a34a"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {points.map((point) => (
                                <circle
                                    key={point.year}
                                    cx={point.x}
                                    cy={point.y}
                                    r="5"
                                    fill="#16a34a"
                                    stroke="white"
                                    strokeWidth="2"
                                >
                                    <title>
                                        {point.count} uploads in {point.year}
                                    </title>
                                </circle>
                            ))}
                        </svg>
                        <div className="absolute inset-x-0 bottom-0 flex h-8 items-start justify-between pt-2 text-[10px] leading-3 text-[#99a1af]">
                            {data.map((item) => (
                                <span key={item.year}>{item.year}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}
