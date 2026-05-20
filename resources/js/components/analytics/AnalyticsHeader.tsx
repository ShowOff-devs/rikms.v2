import { Download, FileDown } from 'lucide-react';

export function AnalyticsHeader({ onExport }: { onExport: () => void }) {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#6a7282]">
                    <span>Agency</span>
                    <span className="text-[#99a1af]">/</span>
                    <span className="text-[#1e3a8a]">Research Analytics</span>
                </div>
                <h1 className="mt-2 text-[24px] leading-8 font-bold text-[#1e3a8a]">
                    Agency Research Analytics
                </h1>
                <p className="mt-1 max-w-[680px] text-sm leading-5 text-[#6a7282]">
                    Track research outputs, access activity, and impact across
                    your agency&apos;s repository.
                </p>
            </div>

            <button
                type="button"
                onClick={onExport}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#172f70]"
            >
                <FileDown className="size-4" />
                Export Report
                <Download className="size-3.5 opacity-80" />
            </button>
        </section>
    );
}
