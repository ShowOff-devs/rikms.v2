import { Download, Eye, MousePointerClick } from 'lucide-react';
import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import type { MostAccessedResearch } from '@/types/analytics';

export function MostAccessedResearchTable({
    records,
    onSelect,
}: {
    records: MostAccessedResearch[];
    onSelect: (record: MostAccessedResearch) => void;
}) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between gap-3 p-6">
                <div>
                    <h2 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                        Most Accessed Research
                    </h2>
                    <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                        Ranked by combined downloads and views.
                    </p>
                </div>
                <span className="hidden items-center gap-1 rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-medium text-[#1e3a8a] sm:inline-flex">
                    <MousePointerClick className="size-3.5" />
                    Drill down
                </span>
            </div>

            {records.length === 0 ? (
                <div className="px-6 pb-6">
                    <AnalyticsEmptyState />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="border-y border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                            <tr>
                                <th className="px-6 py-3">Research Title</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Year</th>
                                <th className="px-4 py-3">Downloads</th>
                                <th className="px-6 py-3">Views</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record, index) => (
                                <tr
                                    key={record.id}
                                    onClick={() => onSelect(record)}
                                    className="cursor-pointer border-b border-[#f9fafb] hover:bg-[#f9fafb]"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-xs font-bold text-[#1e3a8a]">
                                                {index + 1}
                                            </span>
                                            <span className="max-w-[360px] truncate font-medium text-[#1e2939]">
                                                {record.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-[#6a7282]">
                                        {record.category}
                                    </td>
                                    <td className="px-4 py-4 text-[#6a7282]">
                                        {record.year}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1 font-semibold text-[#1e2939]">
                                            <Download className="size-3.5 text-[#009966]" />
                                            {record.downloads.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 font-semibold text-[#1e2939]">
                                            <Eye className="size-3.5 text-[#f97316]" />
                                            {record.views.toLocaleString()}
                                        </span>
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
