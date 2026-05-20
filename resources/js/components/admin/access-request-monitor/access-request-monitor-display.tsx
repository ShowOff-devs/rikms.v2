import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { accessRequestStatusLabels } from '@/data/mock-access-request-monitor';
import { cn } from '@/lib/utils';
import type { AccessRequestStatus } from '@/types/access-request-monitor';

export const accessRequestDateTimeFormatter = new Intl.DateTimeFormat(
    'en-US',
    {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    },
);

export const accessRequestShortDateFormatter = new Intl.DateTimeFormat(
    'en-US',
    {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    },
);

const statusStyles: Record<
    AccessRequestStatus,
    { badge: string; dot: string; icon: LucideIcon }
> = {
    approved: {
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        dot: 'bg-[#00c950]',
        icon: CheckCircle2,
    },
    pending: {
        badge: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        dot: 'bg-[#f59e0b]',
        icon: Clock3,
    },
    denied: {
        badge: 'border-[#fecaca] bg-[#fef2f2] text-[#c10007]',
        dot: 'bg-[#fb2c36]',
        icon: XCircle,
    },
};

export function formatAccessRequestDateTime(value?: string) {
    if (!value) {
        return 'Not available';
    }

    return accessRequestDateTimeFormatter
        .format(new Date(value))
        .replace(',', ' -');
}

export function formatAccessRequestDate(value?: string) {
    if (!value) {
        return 'Not available';
    }

    return accessRequestShortDateFormatter.format(new Date(value));
}

export function AccessRequestStatusBadge({
    status,
}: {
    status: AccessRequestStatus;
}) {
    const styles = statusStyles[status];

    return (
        <span
            className={cn(
                'inline-flex min-h-[26px] items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] leading-3 font-semibold',
                styles.badge,
            )}
        >
            <span className={cn('size-1.5 rounded-full', styles.dot)} />
            {accessRequestStatusLabels[status]}
        </span>
    );
}

export function AgencyBadge({ agency }: { agency: string }) {
    return (
        <span className="inline-flex rounded-[6px] bg-[#1e3a8a]/5 px-2 py-1 text-[11px] font-semibold text-[#1e3a8a]">
            {agency}
        </span>
    );
}

export function getStatusIcon(status: AccessRequestStatus) {
    return statusStyles[status].icon;
}
