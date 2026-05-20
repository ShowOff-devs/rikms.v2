import {
    AlertCircle,
    AlertTriangle,
    Clock,
    Info,
    LockKeyhole,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    UserX,
    Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
    LoginStatus,
    SecurityAlertStatus,
    SecuritySeverity,
} from '@/types/security-center';

export const severityStyles = {
    low: {
        badge: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
        soft: 'bg-[#eff6ff] text-[#1d4ed8]',
        dot: 'bg-[#51a2ff]',
        ring: 'border-[#51a2ff] bg-[#dbeafe]',
        icon: Info,
    },
    medium: {
        badge: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
        soft: 'bg-[#fffbeb] text-[#bb4d00]',
        dot: 'bg-[#ffb900]',
        ring: 'border-[#ffb900] bg-[#fef3c7]',
        icon: AlertTriangle,
    },
    high: {
        badge: 'border-[#ffc9c9] bg-[#fef2f2] text-[#c10007]',
        soft: 'bg-[#fef2f2] text-[#c10007]',
        dot: 'bg-[#fb2c36]',
        ring: 'border-[#ff6467] bg-[#ffe2e2]',
        icon: ShieldAlert,
    },
    critical: {
        badge: 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]',
        soft: 'bg-[#fff1f2] text-[#be123c]',
        dot: 'bg-[#e11d48]',
        ring: 'border-[#e11d48] bg-[#ffe4e6]',
        icon: AlertCircle,
    },
} satisfies Record<
    SecuritySeverity,
    {
        badge: string;
        soft: string;
        dot: string;
        ring: string;
        icon: LucideIcon;
    }
>;

export const alertStatusStyles = {
    open: 'border-[#ffc9c9] bg-[#fef2f2] text-[#e7000b]',
    acknowledged: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
    resolved: 'border-[#d1d5dc] bg-[#f9fafb] text-[#4a5565]',
} satisfies Record<SecurityAlertStatus, string>;

export const loginStatusStyles = {
    success: {
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        row: '',
    },
    failed: {
        badge: 'border-[#ffc9c9] bg-[#fef2f2] text-[#e7000b]',
        row: 'bg-[#fef2f2]/35',
    },
} satisfies Record<LoginStatus, { badge: string; row: string }>;

export const roleStyles = {
    'Super Admin': 'bg-[#fffbeb] text-[#bb4d00]',
    'Agency Admin': 'bg-[#eff6ff] text-[#1e3a8a]',
    Unknown: 'bg-[#fef2f2] text-[#c10007]',
};

export const summaryIconStyles = {
    mfa: {
        icon: ShieldCheck,
        className: 'bg-[#dcfce7] text-[#008236]',
    },
    failed: {
        icon: ShieldAlert,
        className: 'bg-[#ffe2e2] text-[#e7000b]',
    },
    locked: {
        icon: LockKeyhole,
        className: 'bg-[#fef3c7] text-[#bb4d00]',
    },
    sessions: {
        icon: Wifi,
        className: 'bg-[#dbeafe] text-[#1d4ed8]',
    },
    alerts: {
        icon: AlertCircle,
        className: 'bg-[#f3e8ff] text-[#7e22ce]',
    },
};

export const sessionStatusStyles = {
    active: {
        badge: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
        icon: UserCheck,
    },
    idle: {
        badge: 'border-[#e5e7eb] bg-[#f9fafb] text-[#6a7282]',
        icon: Clock,
    },
};

export const revokedSessionIcon = UserX;

export function toTitleCase(value: string) {
    return value
        .split('-')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ');
}
