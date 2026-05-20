import { Download } from 'lucide-react';

type AccessRequestMonitorHeaderProps = {
    onExport: () => void;
};

export function AccessRequestMonitorHeader({
    onExport,
}: AccessRequestMonitorHeaderProps) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                    Access Request Monitoring
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                    Monitor research download requests submitted across all
                    participating agencies.
                </p>
            </div>

            <button
                type="button"
                onClick={onExport}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#d1d5dc] hover:bg-[#f9fafb]"
            >
                <Download className="size-4" aria-hidden="true" />
                Export Access Report
            </button>
        </header>
    );
}
