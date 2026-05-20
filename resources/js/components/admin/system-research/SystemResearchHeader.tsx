import { Download } from 'lucide-react';

export function SystemResearchHeader({
    onExport,
}: {
    onExport: () => void;
}) {
    return (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
                <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                    System Research Repository
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                    Browse and manage all research records across the RIKMS
                    platform.
                </p>
            </div>

            <button
                type="button"
                onClick={onExport}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] shadow-sm transition hover:bg-[#f9fafb]"
            >
                <Download className="size-4" aria-hidden="true" />
                Export Records
            </button>
        </div>
    );
}
