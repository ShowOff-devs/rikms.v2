import { Download, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function SystemAnalyticsHeader({
    selectedRange,
    isExporting,
    onRangeChange,
    onExport,
}: {
    selectedRange: string;
    isExporting: boolean;
    onRangeChange: (value: string) => void;
    onExport: () => void;
}) {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <h1 className="text-[24px] leading-9 font-bold tracking-normal text-[#0f172a]">
                    System Analytics
                </h1>
                <p className="mt-0.5 text-sm leading-5 text-[#6b7280]">
                    Analyze research activity, system usage, and agency
                    contributions across the RIKMS platform.
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={selectedRange} onValueChange={onRangeChange}>
                    <SelectTrigger className="h-[42px] w-[140px] rounded-[14px] border-[#e5e7eb] bg-white text-sm text-[#4a5565] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="this-year">This Year</SelectItem>
                        <SelectItem value="last-30-days">
                            Last 30 days
                        </SelectItem>
                        <SelectItem value="all-time">All Time</SelectItem>
                    </SelectContent>
                </Select>

                <button
                    type="button"
                    onClick={onExport}
                    disabled={isExporting}
                    className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-5 text-sm font-medium text-[#4a5565] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition hover:bg-[#f9fafb] disabled:cursor-wait disabled:opacity-70"
                >
                    {isExporting ? (
                        <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Download className="size-4" aria-hidden="true" />
                    )}
                    Export Analytics Report
                </button>
            </div>
        </section>
    );
}
