import { Download } from 'lucide-react';

type SecurityCenterHeaderProps = {
    onExport: () => void;
};

export function SecurityCenterHeader({ onExport }: SecurityCenterHeaderProps) {
    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                    Security Center
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-5 text-[#6b7280]">
                    Monitor system security events and administrative access
                    across the RIKMS platform.
                </p>
            </div>

            <button
                type="button"
                onClick={onExport}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] transition hover:bg-[#f9fafb]"
            >
                <Download className="size-4" aria-hidden="true" />
                Export Security Report
            </button>
        </div>
    );
}
