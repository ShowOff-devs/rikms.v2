import { Link } from '@inertiajs/react';
import { KeyRound, MonitorCog, ShieldCheck, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { show as showTwoFactor } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';

export type AccountSettingsPage =
    | 'profile'
    | 'password'
    | 'two-factor'
    | 'appearance';

type Props = {
    activePage: AccountSettingsPage;
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
};

const navigationItems = [
    {
        id: 'profile' as const,
        label: 'Profile',
        description: 'Personal information',
        href: editProfile(),
        icon: UserRound,
    },
    {
        id: 'password' as const,
        label: 'Password',
        description: 'Update your password',
        href: editPassword(),
        icon: KeyRound,
    },
    {
        id: 'two-factor' as const,
        label: 'Two-factor authentication',
        description: 'Secure your sign-in',
        href: showTwoFactor(),
        icon: ShieldCheck,
    },
    {
        id: 'appearance' as const,
        label: 'Appearance',
        description: 'Display preferences',
        href: editAppearance(),
        icon: MonitorCog,
    },
];

export function SuperAdminAccountSettingsLayout({
    activePage,
    eyebrow,
    title,
    description,
    children,
}: Props) {
    const [search, setSearch] = useState('');

    return (
        <AdminLayout
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search administration..."
        >
            <main className="px-4 py-8 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-[#1e3a8a] uppercase">
                                {eyebrow}
                            </p>
                            <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                                {title}
                            </h1>
                            <p className="mt-1 text-sm leading-5 text-[#4a5565]">
                                {description}
                            </p>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold text-[#9a3412]">
                            <ShieldCheck
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            Super Administrator
                        </span>
                    </header>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
                        <aside className="rounded-[14px] border border-[#e5e7eb] bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                            <div className="px-3 pt-3 pb-2">
                                <p className="text-xs font-bold tracking-[0.08em] text-[#99a1af] uppercase">
                                    Account settings
                                </p>
                            </div>
                            <nav
                                className="space-y-1"
                                aria-label="Account settings"
                            >
                                {navigationItems.map((item) => {
                                    const isActive = item.id === activePage;

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            aria-current={
                                                isActive ? 'page' : undefined
                                            }
                                            className={cn(
                                                'group flex min-h-14 items-center gap-3 rounded-[10px] px-3 py-2 transition',
                                                isActive
                                                    ? 'bg-[#eef2ff] text-[#1e3a8a]'
                                                    : 'text-[#4a5565] hover:bg-[#f9fafb] hover:text-[#101828]',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-[10px] transition',
                                                    isActive
                                                        ? 'bg-white text-[#1e3a8a] shadow-sm'
                                                        : 'bg-[#f3f4f6] text-[#6a7282] group-hover:text-[#1e3a8a]',
                                                )}
                                            >
                                                <item.icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-semibold">
                                                    {item.label}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-0.5 block truncate text-xs',
                                                        isActive
                                                            ? 'text-[#4338ca]/70'
                                                            : 'text-[#99a1af]',
                                                    )}
                                                >
                                                    {item.description}
                                                </span>
                                            </span>
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="mt-2 rounded-[10px] bg-[#f8fafc] p-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#364153]">
                                    <ShieldCheck className="size-3.5 text-[#008236]" />
                                    Administrator account
                                </div>
                                <p className="mt-1.5 text-xs leading-4 text-[#99a1af]">
                                    Security changes affect access to all RIKMS
                                    administration features.
                                </p>
                            </div>
                        </aside>

                        <div className="min-w-0">{children}</div>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}
