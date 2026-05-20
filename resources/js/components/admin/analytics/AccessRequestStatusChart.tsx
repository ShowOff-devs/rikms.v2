import { ClipboardList } from 'lucide-react';
import {
    ChartEmptyState,
    ChartSection,
    formatNumber,
} from '@/components/admin/analytics/chart-utils';
import type { AccessRequestStatusSummary } from '@/types/system-analytics';

const statusItems = [
    { key: 'approved', label: 'Approved', color: '#16a34a' },
    { key: 'pending', label: 'Pending', color: '#d97706' },
    { key: 'denied', label: 'Denied', color: '#dc2626' },
] as const;

function donutSegment(percent: number, offset: number, color: string) {
    return (
        <circle
            cx="110"
            cy="110"
            r="58"
            fill="none"
            stroke={color}
            strokeDasharray={`${percent} ${100 - percent}`}
            strokeDashoffset={-offset}
            strokeWidth="30"
        />
    );
}

export function AccessRequestStatusChart({
    data,
    isLoading,
}: {
    data: AccessRequestStatusSummary;
    isLoading: boolean;
}) {
    const total = data.approved + data.pending + data.denied;
    const segments = statusItems.reduce<
        Array<(typeof statusItems)[number] & { offset: number; percent: number }>
    >((items, item) => {
        const previous = items[items.length - 1];
        const value = data[item.key];
        const percent = total === 0 ? 0 : (value / total) * 100;

        return [
            ...items,
            {
                ...item,
                offset: previous ? previous.offset + previous.percent : 25,
                percent,
            },
        ];
    }, []);

    return (
        <ChartSection
            title="Access Request Status"
            description="Distribution of access request outcomes."
            icon={ClipboardList}
            iconClassName="bg-[#eff6ff] text-[#2563eb]"
        >
            <div className="h-[324px] p-5">
                {isLoading ? (
                    <div className="h-full animate-pulse rounded-[10px] bg-[#f8fafc]" />
                ) : total === 0 ? (
                    <ChartEmptyState />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4">
                        <svg
                            viewBox="0 0 220 220"
                            className="size-[220px] -rotate-90"
                            role="img"
                            aria-label="Access request status distribution"
                        >
                            {segments.map((item) => {
                                const value = data[item.key];
                                const segment = donutSegment(
                                    item.percent,
                                    item.offset,
                                    item.color,
                                );

                                return (
                                    <g key={item.key}>
                                        {segment}
                                        <title>
                                            {item.label}: {value} requests
                                        </title>
                                    </g>
                                );
                            })}
                            <circle cx="110" cy="110" r="36" fill="white" />
                        </svg>

                        <div className="flex items-center justify-center gap-8">
                            {statusItems.map((item) => (
                                <div
                                    key={item.key}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6a7282]">
                                        <span
                                            className="size-2.5 rounded-full"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        {item.label}
                                    </span>
                                    <span className="text-lg leading-7 font-bold text-[#1e2939]">
                                        {formatNumber(data[item.key])}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ChartSection>
    );
}
