import { Download } from 'lucide-react';

type ModerationHeaderProps = {
    onExport: () => void;
};

export function ModerationHeader({ onExport }: ModerationHeaderProps) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-[22px] leading-7 font-bold text-[#0f172a]">
                    Research Integrity & Moderation
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                    Review and moderate research records to ensure metadata
                    completeness and policy compliance.
                </p>
            </div>

            <button
                type="button"
                onClick={onExport}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#364153] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#d1d5dc] hover:bg-[#f9fafb]"
            >
                <Download className="size-4" aria-hidden="true" />
                Export Moderation Report
            </button>
        </header>
    );
}
