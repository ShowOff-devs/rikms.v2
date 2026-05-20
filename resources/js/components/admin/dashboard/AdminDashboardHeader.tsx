import { Download, Loader2 } from 'lucide-react';
import type { GeneratedSystemReport } from '@/types/admin-dashboard';

type AdminDashboardHeaderProps = {
    isGeneratingReport: boolean;
    generatedReport: GeneratedSystemReport | null;
    onGenerateReport: () => void;
};

export function AdminDashboardHeader({
    isGeneratingReport,
    generatedReport,
    onGenerateReport,
}: AdminDashboardHeaderProps) {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <h1 className="text-[24px] leading-8 font-bold tracking-normal text-[#0f172a]">
                    System Dashboard
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                    Monitor and manage the RIKMS platform across participating
                    agencies.
                </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
                <button
                    type="button"
                    onClick={onGenerateReport}
                    disabled={isGeneratingReport}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-[#1d3478] disabled:cursor-wait disabled:opacity-70"
                >
                    {isGeneratingReport ? (
                        <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Download className="size-4" aria-hidden="true" />
                    )}
                    {isGeneratingReport
                        ? 'Generating Report'
                        : 'Generate System Report'}
                </button>
                {generatedReport && (
                    <p className="rounded-[8px] border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-xs leading-4 text-[#166534]">
                        {generatedReport.fileName} is ready for export.
                    </p>
                )}
            </div>
        </section>
    );
}
