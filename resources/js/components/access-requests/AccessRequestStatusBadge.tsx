import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import type { AccessRequestStatus } from '@/types/access-request';

const statusConfig = {
    pending: {
        label: 'Pending',
        icon: Clock3,
        className: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
    },
    approved: {
        label: 'Approved',
        icon: CheckCircle2,
        className: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
    },
    denied: {
        label: 'Denied',
        icon: XCircle,
        className: 'border-[#ffc9c9] bg-[#fef2f2] text-[#e7000b]',
    },
};

export function AccessRequestStatusBadge({
    status,
}: {
    status: AccessRequestStatus;
}) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex h-[22px] items-center gap-1.5 rounded-full border px-[10px] text-xs leading-4 font-medium ${config.className}`}
        >
            <Icon className="size-3" />
            {config.label}
        </span>
    );
}
