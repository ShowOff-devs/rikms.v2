import { FileDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AnalyticsFilters } from '@/types/analytics';

export function ExportReportDialog({
    open,
    filters,
    isExporting,
    onOpenChange,
    onConfirm,
}: {
    open: boolean;
    filters: AnalyticsFilters;
    isExporting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    const activeFilters = Object.entries(filters).filter(
        ([, value]) => value && value !== 'all',
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#1e3a8a]">
                        <FileDown className="size-5" />
                        Export Analytics Report
                    </DialogTitle>
                    <DialogDescription>
                        Generate a mock export using the active agency analytics
                        filters. This is ready to connect to PDF or CSV
                        endpoints later.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <div>
                        <p className="text-sm font-semibold text-[#1e2939]">
                            Included sections
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {[
                                'Summary metrics',
                                'Publication charts',
                                'SDG contribution',
                                'Access requests',
                                'Download activity',
                                'Most accessed research',
                            ].map((section) => (
                                <label
                                    key={section}
                                    className="flex items-center gap-2 text-sm text-[#4a5565]"
                                >
                                    <input
                                        type="checkbox"
                                        checked
                                        readOnly
                                        className="size-4 rounded border-[#d1d5dc]"
                                    />
                                    {section}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-[#1e2939]">
                            Active filters
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {activeFilters.length === 0 ? (
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6a7282]">
                                    All agency data
                                </span>
                            ) : (
                                activeFilters.map(([key, value]) => (
                                    <span
                                        key={key}
                                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1e3a8a]"
                                    >
                                        {key}: {value}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isExporting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white disabled:opacity-70"
                    >
                        <FileDown className="size-4" />
                        {isExporting ? 'Exporting...' : 'Generate export'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
