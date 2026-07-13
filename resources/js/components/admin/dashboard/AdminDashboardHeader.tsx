import { Download } from 'lucide-react';

export function AdminDashboardHeader() {
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
                    disabled
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                    <Download className="size-4" aria-hidden="true" />
                    System Report Unavailable
                </button>
                <p className="max-w-[280px] text-xs leading-4 text-[#6a7282] sm:text-right">
                    System report export is not available during the pilot.
                </p>
            </div>
        </section>
    );
}
