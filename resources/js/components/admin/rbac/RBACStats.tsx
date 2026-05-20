import type { LucideIcon } from 'lucide-react';
import { KeyRound, Shield, ShieldCheck, UsersRound } from 'lucide-react';

type RBACStatsProps = {
    totalRoles: number;
    systemRoles: number;
    totalPermissions: number;
    usersWithRoles: number;
};

type StatCard = {
    label: string;
    value: number;
    icon: LucideIcon;
    className: string;
};

export function RBACStats({
    totalRoles,
    systemRoles,
    totalPermissions,
    usersWithRoles,
}: RBACStatsProps) {
    const stats: StatCard[] = [
        {
            label: 'Total Roles',
            value: totalRoles,
            icon: Shield,
            className: 'bg-[#dbeafe] text-[#1e3a8a]',
        },
        {
            label: 'System Roles',
            value: systemRoles,
            icon: ShieldCheck,
            className: 'bg-[#fee2e2] text-[#fb2c36]',
        },
        {
            label: 'Total Permissions',
            value: totalPermissions,
            icon: KeyRound,
            className: 'bg-[#fef3c7] text-[#d97706]',
        },
        {
            label: 'Users with Roles',
            value: usersWithRoles,
            icon: UsersRound,
            className: 'bg-[#dcfce7] text-[#16a34a]',
        },
    ];

    return (
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
                <article
                    key={stat.label}
                    className="flex h-[86px] items-center gap-4 rounded-[10px] border border-[#e5e7eb] bg-white px-5 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                >
                    <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] ${stat.className}`}
                    >
                        <stat.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                        <span className="block text-[20px] leading-7 font-bold text-[#101828]">
                            {stat.value.toLocaleString()}
                        </span>
                        <span className="block text-xs leading-4 text-[#4a5565]">
                            {stat.label}
                        </span>
                    </span>
                </article>
            ))}
        </section>
    );
}
