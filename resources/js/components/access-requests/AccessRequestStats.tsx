import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import type {
    AccessRequest,
    AccessRequestStatus,
} from '@/types/access-request';

const statItems: Array<{
    key: 'total' | AccessRequestStatus;
    label: string;
    icon: typeof FileText;
    iconClassName: string;
}> = [
    {
        key: 'total',
        label: 'Total Requests',
        icon: FileText,
        iconClassName: 'bg-[#eff6ff] text-[#1e3a8a]',
    },
    {
        key: 'pending',
        label: 'Pending Requests',
        icon: Clock3,
        iconClassName: 'bg-[#fff7ed] text-[#f97316]',
    },
    {
        key: 'approved',
        label: 'Approved Requests',
        icon: CheckCircle2,
        iconClassName: 'bg-[#ecfdf5] text-[#009966]',
    },
    {
        key: 'denied',
        label: 'Denied Requests',
        icon: XCircle,
        iconClassName: 'bg-[#fef2f2] text-[#fb2c36]',
    },
];

export function AccessRequestStats({
    requests,
}: {
    requests: AccessRequest[];
}) {
    const counts = requests.reduce(
        (totals, request) => ({
            ...totals,
            [request.status]: totals[request.status] + 1,
        }),
        {
            total: requests.length,
            pending: 0,
            approved: 0,
            denied: 0,
        },
    );

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statItems.map((item) => {
                const Icon = item.icon;

                return (
                    <article
                        key={item.key}
                        className="flex h-[82px] items-center gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-[17px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${item.iconClassName}`}
                        >
                            <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-2xl leading-8 font-bold text-[#1e2939]">
                                {counts[item.key]}
                            </span>
                            <span className="block text-xs leading-4 text-[#6a7282]">
                                {item.label}
                            </span>
                        </span>
                    </article>
                );
            })}
        </section>
    );
}
