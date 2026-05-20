import { TrendingUp } from 'lucide-react';
import {
    chartCardClassName,
    ChartEmptyState,
    formatNumber,
} from '@/components/admin/analytics/chart-utils';
import type { MostAccessedResearch } from '@/types/system-analytics';

export function MostAccessedResearchTable({
    records,
    isLoading,
}: {
    records: MostAccessedResearch[];
    isLoading: boolean;
}) {
    return (
        <article className={chartCardClassName}>
            <div className="flex h-[69px] items-center gap-2.5 border-b border-[#f3f4f6] px-6 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[14px] bg-[#fffbeb] text-[#d97706]">
                    <TrendingUp className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h2 className="truncate text-sm leading-5 font-bold text-[#0f172a]">
                        Most Accessed Research
                    </h2>
                    <p className="truncate text-xs leading-4 text-[#99a1af]">
                        Top research records by downloads.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="h-[540px] p-5">
                    <div className="h-full animate-pulse rounded-[10px] bg-[#f8fafc]" />
                </div>
            ) : records.length === 0 ? (
                <div className="p-5">
                    <ChartEmptyState />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full border-collapse">
                        <thead className="bg-[#f9fafb]/80">
                            <tr className="h-10 text-left text-xs font-semibold text-[#6a7282]">
                                <th className="w-[60px] px-6">#</th>
                                <th className="px-4">Research Title</th>
                                <th className="w-[180px] px-4">Agency</th>
                                <th className="w-[110px] px-4 text-center">
                                    Year
                                </th>
                                <th className="w-[120px] px-4 text-right">
                                    Views
                                </th>
                                <th className="w-[140px] px-6 text-right">
                                    Downloads
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record, index) => (
                                <tr
                                    key={record.id}
                                    className="h-[55px] border-b border-[#f9fafb] text-sm"
                                >
                                    <td className="px-6">
                                        <span
                                            className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                                index < 3
                                                    ? 'bg-[#1e3a8a] text-white'
                                                    : 'bg-[#f3f4f6] text-[#6a7282]'
                                            }`}
                                        >
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="max-w-[380px] px-4">
                                        <span
                                            className="block truncate font-medium text-[#1e2939]"
                                            title={record.title}
                                        >
                                            {record.title}
                                        </span>
                                    </td>
                                    <td className="px-4">
                                        <span className="inline-flex rounded-[8px] bg-[rgba(30,58,138,0.05)] px-2 py-1 text-xs font-semibold text-[#1e3a8a]">
                                            {record.agency}
                                        </span>
                                    </td>
                                    <td className="px-4 text-center text-xs text-[#6a7282]">
                                        {record.year}
                                    </td>
                                    <td className="px-4 text-right text-xs font-semibold text-[#4a5565]">
                                        {formatNumber(record.views)}
                                    </td>
                                    <td className="px-6 text-right text-xs font-bold text-[#1e3a8a]">
                                        {formatNumber(record.downloads)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}
