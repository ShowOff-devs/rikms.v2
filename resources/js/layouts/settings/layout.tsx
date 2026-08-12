import { Link } from '@inertiajs/react';
import { KeyRound, MonitorCog, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: UserRound,
    },
    {
        title: 'Password',
        href: editPassword(),
        icon: KeyRound,
    },
    {
        title: 'Two-factor authentication',
        href: show(),
        icon: ShieldCheck,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: MonitorCog,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className="min-h-full bg-slate-50 px-4 py-7 sm:px-6 lg:px-8 dark:bg-slate-950">
            <div className="mx-auto max-w-6xl">
                <div className="mb-7">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        Account settings
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                        Profile Settings
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Manage your profile, security, and account preferences.
                    </p>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <aside className="w-full shrink-0 lg:w-64">
                        <nav
                            className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4 lg:grid-cols-1 dark:border-slate-800 dark:bg-slate-900"
                            aria-label="Settings"
                        >
                            {sidebarNavItems.map((item, index) => (
                                <Button
                                    key={`${toUrl(item.href)}-${index}`}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        'h-auto min-h-10 w-full justify-start px-3 py-2 text-left whitespace-normal text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-blue-950',
                                        {
                                            'bg-blue-50 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200':
                                                isCurrentOrParentUrl(item.href),
                                        },
                                    )}
                                >
                                    <Link href={item.href}>
                                        {item.icon && (
                                            <item.icon className="h-4 w-4" />
                                        )}
                                        {item.title}
                                    </Link>
                                </Button>
                            ))}
                        </nav>
                    </aside>

                    <Separator className="hidden" />

                    <div className="min-w-0 flex-1">
                        <section className="space-y-6">{children}</section>
                    </div>
                </div>
            </div>
        </div>
    );
}
