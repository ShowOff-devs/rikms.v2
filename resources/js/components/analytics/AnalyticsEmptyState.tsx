import { BarChart3 } from 'lucide-react';

export function AnalyticsEmptyState({
    title = 'No analytics data found',
    description = 'Adjust or clear the filters to see agency analytics.',
}: {
    title?: string;
    description?: string;
}) {
    return (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d1d5dc] bg-[#f9fafb] px-6 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-[10px] bg-white text-[#6a7282] shadow-sm">
                <BarChart3 className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[#1e2939]">
                {title}
            </h3>
            <p className="mt-1 max-w-[340px] text-sm leading-5 text-[#6a7282]">
                {description}
            </p>
        </div>
    );
}
