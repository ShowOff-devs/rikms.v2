import { AlertTriangle, CheckCircle2, ServerCog } from 'lucide-react';
import type { QueueHealth } from '@/types/security-center';

type Props = {
    health: QueueHealth | null;
    isLoading: boolean;
};

export function QueueHealthPanel({ health, isLoading }: Props) {
    const attention = health?.status !== 'healthy';
    const Icon = attention ? AlertTriangle : CheckCircle2;

    return (
        <section className="mt-6 rounded-[12px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[#1e3a8a]">
                        <ServerCog className="size-5" />
                        <h2 className="text-lg font-semibold">Queue Health</h2>
                    </div>
                    <p className="mt-1 text-sm text-[#64748b]">
                        Operational queue backlog summary. This does not detect
                        every queue worker process.
                    </p>
                </div>
                {!isLoading && health && (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${attention ? 'bg-[#fff7ed] text-[#b45309]' : 'bg-[#f0fdf4] text-[#15803d]'}`}
                    >
                        <Icon className="size-3.5" />
                        {health.status.toUpperCase()}
                    </span>
                )}
            </div>

            {isLoading || !health ? (
                <p className="mt-5 text-sm text-[#64748b]">
                    Loading queue health…
                </p>
            ) : (
                <>
                    <dl className="mt-5 grid gap-3 sm:grid-cols-4">
                        <Metric
                            label="Connection"
                            value={health.queueConnection}
                        />
                        <Metric
                            label="Pending jobs"
                            value={health.pendingJobs}
                        />
                        <Metric label="Failed jobs" value={health.failedJobs} />
                        <Metric
                            label="Oldest pending"
                            value={
                                health.oldestPendingJobAgeMinutes === null
                                    ? 'None'
                                    : `${health.oldestPendingJobAgeMinutes} min`
                            }
                        />
                    </dl>
                    {attention && (
                        <p className="mt-4 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
                            Email notifications and background tasks may not be
                            delivered until a queue worker is running.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

function Metric({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg bg-[#f8fafc] p-3">
            <dt className="text-xs font-medium text-[#64748b]">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-[#0f172a]">
                {value}
            </dd>
        </div>
    );
}
