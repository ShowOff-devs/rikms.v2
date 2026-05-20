import { Monitor, ShieldCheck, Trash2 } from 'lucide-react';
import {
    roleStyles,
    sessionStatusStyles,
} from '@/components/admin/security-center/security-center-display';
import { cn } from '@/lib/utils';
import type { AdminSession } from '@/types/security-center';

type ActiveAdminSessionsProps = {
    sessions: AdminSession[];
    isLoading: boolean;
    onRevoke: (session: AdminSession) => void;
};

export function ActiveAdminSessions({
    sessions,
    isLoading,
    onRevoke,
}: ActiveAdminSessionsProps) {
    const onlineCount = sessions.filter(
        (session) => session.status === 'active',
    ).length;

    return (
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex min-h-[65px] items-center justify-between gap-4 border-b border-[#f3f4f6] px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f0fdf4] text-[#008236]">
                        <ShieldCheck className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        Active Admin Sessions
                    </h2>
                </div>
                <span className="inline-flex h-[24px] items-center rounded-full border border-[#b9f8cf] bg-[#f0fdf4] px-2.5 text-[11px] font-semibold text-[#008236]">
                    {onlineCount} Online
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-left">
                    <thead className="bg-[#f9fafb]/80">
                        <tr className="h-10 text-xs font-semibold text-[#6a7282]">
                            <th className="px-6">User</th>
                            <th className="px-6">Role</th>
                            <th className="px-6">Device</th>
                            <th className="px-6">IP Address</th>
                            <th className="px-6">Last Activity</th>
                            <th className="px-6">Status</th>
                            <th className="px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }, (_, index) => (
                                <tr
                                    key={index}
                                    className="h-[64px] border-b border-[#f9fafb]"
                                >
                                    {Array.from({ length: 7 }, (_, cell) => (
                                        <td key={cell} className="px-6">
                                            <div className="h-3.5 animate-pulse rounded bg-[#f3f4f6]" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : sessions.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-12 text-center"
                                >
                                    <p className="text-sm font-semibold text-[#1e2939]">
                                        No active admin sessions
                                    </p>
                                    <p className="mt-1 text-xs text-[#6a7282]">
                                        Active Super Admin and Agency Admin
                                        sessions will appear here.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            sessions.map((session) => {
                                const status =
                                    sessionStatusStyles[session.status];
                                const StatusIcon = status.icon;

                                return (
                                    <tr
                                        key={session.id}
                                        className="h-[64px] border-b border-[#f9fafb] last:border-b-0"
                                    >
                                        <td className="px-6">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-bold text-[#1e3a8a]">
                                                    {session.user
                                                        .split(' ')
                                                        .map((part) => part[0])
                                                        .join('')
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </span>
                                                <span className="text-sm font-semibold text-[#1e2939]">
                                                    {session.user}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6">
                                            <span
                                                className={cn(
                                                    'inline-flex rounded-[8px] px-2 py-1 text-xs leading-4 font-semibold',
                                                    roleStyles[session.role],
                                                )}
                                            >
                                                {session.role}
                                            </span>
                                        </td>
                                        <td className="px-6 text-xs text-[#4a5565]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Monitor
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {session.device}
                                            </span>
                                        </td>
                                        <td className="px-6">
                                            <code className="rounded-[4px] bg-[#f3f4f6] px-2 py-1 font-mono text-xs text-[#6a7282]">
                                                {session.ipAddress}
                                            </code>
                                        </td>
                                        <td className="px-6 text-xs whitespace-nowrap text-[#6a7282]">
                                            {session.lastActivity}
                                        </td>
                                        <td className="px-6">
                                            <span
                                                className={cn(
                                                    'inline-flex h-[24px] items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold',
                                                    status.badge,
                                                )}
                                            >
                                                <StatusIcon
                                                    className="size-3"
                                                    aria-hidden="true"
                                                />
                                                {session.status === 'active'
                                                    ? 'Active'
                                                    : 'Idle'}
                                            </span>
                                        </td>
                                        <td className="px-6">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onRevoke(session)
                                                    }
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] border border-[#ffc9c9] text-[#e7000b] transition hover:bg-[#fef2f2]"
                                                    aria-label={`Revoke ${session.user} session`}
                                                    title="Revoke Session"
                                                >
                                                    <Trash2
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
