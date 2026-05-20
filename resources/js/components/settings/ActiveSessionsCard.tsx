import { CheckCircle2, Laptop } from 'lucide-react';
import type { ActiveSession } from '@/types/settings';

type ActiveSessionsCardProps = {
    sessions: ActiveSession[];
};

export function ActiveSessionsCard({ sessions }: ActiveSessionsCardProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#f3f4f6] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                Active Sessions
            </h2>

            <div className="mt-5 space-y-3">
                {sessions.map((session) => (
                    <article
                        key={session.id}
                        className="flex flex-col gap-3 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#1e3a8a]">
                                <Laptop className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-sm leading-5 font-semibold text-[#101828]">
                                    {session.browser} on{' '}
                                    {session.operatingSystem}
                                </h3>
                                <p className="mt-0.5 text-xs leading-4 text-[#6a7282]">
                                    {session.device}
                                </p>
                                <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                                    {session.location}
                                </p>
                            </div>
                        </div>

                        <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-4 font-semibold ${
                                session.status === 'active'
                                    ? 'bg-[#dcfce7] text-[#008236]'
                                    : 'bg-[#f3f4f6] text-[#6a7282]'
                            }`}
                        >
                            {session.isCurrent ? (
                                <CheckCircle2 className="size-3.5" />
                            ) : null}
                            {session.isCurrent ? 'Current Session' : session.status}
                        </span>
                    </article>
                ))}
            </div>
        </section>
    );
}
