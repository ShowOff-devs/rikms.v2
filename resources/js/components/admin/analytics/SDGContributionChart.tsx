import { Globe2 } from 'lucide-react';
import {
    ChartEmptyState,
    ChartSection,
} from '@/components/admin/analytics/chart-utils';
import type { SDGContribution } from '@/types/system-analytics';

export function SDGContributionChart({
    data,
    isLoading,
}: {
    data: SDGContribution[];
    isLoading: boolean;
}) {
    const max = Math.max(...data.map((item) => item.count), 1);

    return (
        <ChartSection
            title="SDG Contribution"
            description="Research counts aligned per SDG."
            icon={Globe2}
            iconClassName="bg-[#ecfeff] text-[#0891b2]"
        >
            <div className="min-h-[380px] p-5">
                {isLoading ? (
                    <div className="h-[340px] animate-pulse rounded-[10px] bg-[#f8fafc]" />
                ) : data.length === 0 ? (
                    <ChartEmptyState />
                ) : (
                    <div className="grid gap-3">
                        {data.map((item) => (
                            <div
                                key={item.sdg}
                                className="grid grid-cols-[145px_1fr_34px] items-center gap-3"
                            >
                                <div
                                    className="truncate text-right text-[10px] leading-4 text-[#6b7280]"
                                    title={`${item.sdg} - ${item.label}`}
                                >
                                    {item.sdg} - {item.label}
                                </div>
                                <div className="h-4 rounded-full bg-[#f9fafb]">
                                    <div
                                        className="h-4 rounded-full"
                                        style={{
                                            width: `${Math.max(
                                                (item.count / max) * 100,
                                                4,
                                            )}%`,
                                            backgroundColor:
                                                item.color ?? '#1e3a8a',
                                        }}
                                    />
                                </div>
                                <span className="text-right text-[11px] font-semibold text-[#4a5565]">
                                    {item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ChartSection>
    );
}
