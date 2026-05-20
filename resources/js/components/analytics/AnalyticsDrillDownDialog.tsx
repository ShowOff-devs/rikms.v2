import { BarChart3 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type AnalyticsDrillDown = {
    title: string;
    description: string;
    stats?: Array<{ label: string; value: string | number }>;
};

export function AnalyticsDrillDownDialog({
    drillDown,
    open,
    onOpenChange,
}: {
    drillDown: AnalyticsDrillDown | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#1e3a8a]">
                        <BarChart3 className="size-5" />
                        {drillDown?.title ?? 'Analytics detail'}
                    </DialogTitle>
                    <DialogDescription>
                        {drillDown?.description ??
                            'Detailed analytics are ready for backend drill-down data.'}
                    </DialogDescription>
                </DialogHeader>

                {drillDown?.stats?.length ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                        {drillDown.stats.map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4"
                            >
                                <p className="text-xs font-medium text-[#6a7282]">
                                    {stat.label}
                                </p>
                                <p className="mt-2 text-xl font-bold text-[#1e2939]">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm leading-6 text-[#4a5565]">
                    Future Laravel integration can load the selected records,
                    request logs, requester organizations, and export-ready
                    detail rows from this drill-down entry point.
                </div>
            </DialogContent>
        </Dialog>
    );
}
