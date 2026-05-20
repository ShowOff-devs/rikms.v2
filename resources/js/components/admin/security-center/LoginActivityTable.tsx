import { Globe2, Monitor, ShieldCheck } from 'lucide-react';
import {
    loginStatusStyles,
    roleStyles,
} from '@/components/admin/security-center/security-center-display';
import { cn } from '@/lib/utils';
import type { LoginActivity } from '@/types/security-center';

type LoginActivityTableProps = {
    activity: LoginActivity[];
    isLoading: boolean;
};

function LoginStatusBadge({ status }: { status: LoginActivity['status'] }) {
    const classes = loginStatusStyles[status];
    const label = status === 'success' ? 'Success' : 'Failed';

    return (
        <span
            className={cn(
                'inline-flex h-[22px] items-center rounded-full border px-2 text-[10px] font-semibold',
                classes.badge,
            )}
        >
            {label}
        </span>
    );
}

export function LoginActivityTable({
    activity,
    isLoading,
}: LoginActivityTableProps) {
    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex min-h-[65px] items-center gap-2.5 border-b border-[#f3f4f6] px-6 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1d4ed8]">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    Login Activity Monitoring
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead className="bg-[#f9fafb]/80">
                        <tr className="h-10 text-xs font-semibold text-[#6a7282]">
                            <th className="px-6">User</th>
                            <th className="px-6">Role</th>
                            <th className="px-6">IP Address</th>
                            <th className="px-6">Location</th>
                            <th className="px-6">Device / Browser</th>
                            <th className="px-6">Login Time</th>
                            <th className="px-6">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 8 }, (_, index) => (
                                <tr
                                    key={index}
                                    className="h-[57px] border-b border-[#f9fafb]"
                                >
                                    {Array.from({ length: 7 }, (_, cell) => (
                                        <td key={cell} className="px-6">
                                            <div className="h-3.5 animate-pulse rounded bg-[#f3f4f6]" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : activity.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-12 text-center"
                                >
                                    <p className="text-sm font-semibold text-[#1e2939]">
                                        No login activity found
                                    </p>
                                    <p className="mt-1 text-xs text-[#6a7282]">
                                        Recent administrator sign-ins and failed
                                        attempts will appear here.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            activity.map((item) => (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'h-[57px] border-b border-[#f9fafb] last:border-b-0',
                                        loginStatusStyles[item.status].row,
                                    )}
                                >
                                    <td className="px-6">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                                    item.status === 'failed'
                                                        ? 'bg-[#ffe2e2] text-[#e7000b]'
                                                        : 'bg-[#f3f4f6] text-[#4a5565]',
                                                )}
                                            >
                                                {item.user
                                                    .split(' ')
                                                    .map((part) => part[0])
                                                    .join('')
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </span>
                                            <span className="text-sm font-semibold text-[#1e2939]">
                                                {item.user}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-[8px] px-2 py-1 text-xs leading-4 font-semibold',
                                                roleStyles[item.role],
                                            )}
                                        >
                                            {item.role}
                                        </span>
                                    </td>
                                    <td className="px-6">
                                        <code className="rounded-[4px] bg-[#f3f4f6] px-2 py-1 font-mono text-xs text-[#6a7282]">
                                            {item.ipAddress}
                                        </code>
                                    </td>
                                    <td className="px-6 text-xs text-[#6a7282]">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Globe2
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            {item.location}
                                        </span>
                                    </td>
                                    <td className="px-6 text-xs text-[#4a5565]">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Monitor
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            {item.browser
                                                ? `${item.device} / ${item.browser}`
                                                : item.device}
                                        </span>
                                    </td>
                                    <td className="px-6 text-xs whitespace-nowrap text-[#6a7282]">
                                        {item.loginTime}
                                    </td>
                                    <td className="px-6">
                                        <LoginStatusBadge
                                            status={item.status}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
