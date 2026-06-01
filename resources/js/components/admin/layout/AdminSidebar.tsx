import { Link } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    Bell,
    Building2,
    ClipboardList,
    FileSearch,
    FileText,
    KeyRound,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    Users,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

type AdminNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

type AdminSidebarProps = {
    isCollapsed: boolean;
    onToggle: () => void;
};

const adminNavItems: AdminNavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Agency Management', href: '/admin/agencies', icon: Building2 },
    {
        label: 'Agency Admin Users',
        href: '/admin/users',
        icon: Users,
    },
    {
        label: 'System Research',
        href: '/admin/research',
        icon: FileText,
    },
    {
        label: 'Research Integrity & Moderation',
        href: '/admin/moderation',
        icon: FileSearch,
    },
    {
        label: 'Access Request Monitoring',
        href: '/admin/access-requests',
        icon: ClipboardList,
    },
    { label: 'System Analytics', href: '/admin/analytics', icon: BarChart3 },
    {
        label: 'System Notifications & Activity Logs',
        href: '/admin/audit-logs',
        icon: Bell,
    },
    { label: 'RBAC Management', href: '/admin/rbac', icon: KeyRound },
    {
        label: 'Security Center',
        href: '/admin/security',
        icon: ShieldCheck,
    },
    { label: 'Archive', href: '/admin/archive', icon: Archive },
    {
        label: 'Platform Settings',
        href: '/admin/settings',
        icon: Settings,
    },
];

export function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
    const { currentUrl, isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();

    return (
        <aside
            className={cn(
                'sticky top-16 hidden h-[calc(100vh-64px)] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f172a] text-white transition-all duration-300 lg:flex',
                isCollapsed ? 'w-16' : 'w-60',
            )}
        >
            <nav
                className={cn(
                    'flex-1 space-y-0.5 overflow-y-auto py-3',
                    isCollapsed ? 'px-3' : 'px-2',
                )}
            >
                {adminNavItems.map((item) => {
                    const isActive =
                        item.href === '/admin/dashboard'
                            ? isCurrentUrl(item.href, currentUrl)
                            : isCurrentOrParentUrl(item.href, currentUrl);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                'group flex h-10 items-center rounded-[10px] text-sm leading-5 transition-colors',
                                isCollapsed
                                    ? 'w-10 justify-center px-0'
                                    : 'w-full gap-3 px-3',
                                isActive
                                    ? 'bg-[#fe9a00]/15 font-semibold text-[#ffb900]'
                                    : 'font-normal text-white/50 hover:bg-white/[0.07] hover:text-white/80',
                            )}
                            aria-label={item.label}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon
                                className={cn(
                                    'size-5 shrink-0',
                                    isActive
                                        ? 'text-[#ffb900]'
                                        : 'text-white/50 group-hover:text-white/80',
                                )}
                                aria-hidden="true"
                            />
                            {!isCollapsed && (
                                <span className="min-w-0 truncate">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div
                className={cn(
                    'border-t border-white/10 py-4',
                    isCollapsed ? 'px-3' : 'px-5',
                )}
            >
                <button
                    type="button"
                    className={cn(
                        'inline-flex h-8 items-center rounded-[10px] text-xs leading-4 text-white/40 transition hover:bg-white/[0.07] hover:text-white/80',
                        isCollapsed
                            ? 'w-10 justify-center'
                            : '-ml-2 gap-2 px-2',
                    )}
                    onClick={onToggle}
                    aria-label={
                        isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                    }
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? (
                        <ChevronsRight
                            className="size-3.5"
                            aria-hidden="true"
                        />
                    ) : (
                        <ChevronsLeft className="size-3.5" aria-hidden="true" />
                    )}
                    {!isCollapsed && <span>Collapse</span>}
                </button>
            </div>
        </aside>
    );
}
