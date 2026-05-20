import { BellOff, Download } from 'lucide-react';

type SystemActivityHeaderProps = {
    onExport: () => void;
    onClearNotifications: () => void;
};

export function SystemActivityHeader({
    onExport,
    onClearNotifications,
}: SystemActivityHeaderProps) {
    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                    System Notifications & Activity Logs
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                    Monitor system notifications and track administrative
                    activities across the RIKMS platform.
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={onExport}
                    className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] transition hover:bg-[#f9fafb]"
                >
                    <Download className="size-4" aria-hidden="true" />
                    Export Activity Log
                </button>
                <button
                    type="button"
                    onClick={onClearNotifications}
                    className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#ffc9c9] bg-white px-4 text-sm font-medium text-[#e7000b] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] transition hover:bg-[#fef2f2]"
                >
                    <BellOff className="size-4" aria-hidden="true" />
                    Clear Notifications
                </button>
            </div>
        </div>
    );
}
