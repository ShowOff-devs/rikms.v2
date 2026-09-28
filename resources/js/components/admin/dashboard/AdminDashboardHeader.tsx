import { Download } from 'lucide-react';

type AdminDashboardHeaderProps = {
    isExporting: boolean;
    onExport: () => void;
};

export function AdminDashboardHeader({
    isExporting,
    onExport,
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
                    onClick={onExport}
                    disabled={isExporting}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-[#172f73] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
                >
                    <Download className="size-4" aria-hidden="true" />
                    {isExporting
                        ? 'Generating Report...'
                        : 'Download System Report'}
                </button>
                <p className="max-w-[280px] text-xs leading-4 text-[#6a7282] sm:text-right">
                    Export the latest system summary as a PDF file.
                </p>
            </div>
        </section>
    );
}
