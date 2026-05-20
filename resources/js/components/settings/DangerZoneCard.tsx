import { AlertTriangle } from 'lucide-react';

type DangerZoneCardProps = {
    deactivationRequested: boolean;
    onRequestDeactivation: () => void;
};

export function DangerZoneCard({
    deactivationRequested,
    onRequestDeactivation,
}: DangerZoneCardProps) {
    return (
        <section className="rounded-[14px] border border-[#ffc9c9] bg-white px-[25px] pt-[25px] pb-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#ffe2e2] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#e7000b]">
                Danger Zone
            </h2>

            <div className="mt-5 flex flex-col gap-4 rounded-[12px] bg-[#fef2f2] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#e7000b]">
                        <AlertTriangle className="size-4" />
                    </span>
                    <div>
                        <h3 className="text-sm leading-5 font-semibold text-[#991b1b]">
                            Request account deactivation
                        </h3>
                        <p className="mt-0.5 text-sm leading-5 text-[#b91c1c]">
                            This sends a request to the Super Admin for review.
                            Your account remains active until approval.
                        </p>
                        {deactivationRequested ? (
                            <p className="mt-2 text-xs leading-4 font-semibold text-[#008236]">
                                Deactivation request submitted for review.
                            </p>
                        ) : null}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRequestDeactivation}
                    disabled={deactivationRequested}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e7000b] px-4 text-sm leading-5 font-medium text-white hover:bg-[#c10007] disabled:cursor-not-allowed disabled:bg-[#ffc9c9] disabled:text-[#991b1b]"
                >
                    Request Account Deactivation
                </button>
            </div>
        </section>
    );
}
