import { Link, router } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    LayoutDashboard,
    LogOut,
    Search,
    Settings,
    ShieldCheck,
    Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { clearAgencySession } from '@/lib/auth/agency-auth';
import { cn } from '@/lib/utils';
import type { AgencyAuthSession } from '@/types/auth';

type AgencyAdminLayoutProps = {
    children: ReactNode;
    session: AgencyAuthSession;
    search: string;
    onSearchChange: (value: string) => void;
};

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/agency/dashboard' },
    {
        label: 'Research Repository',
        icon: FileText,
        href: '/agency/research',
    },
    { label: 'Upload Research', icon: Upload, href: '/agency/upload' },
    {
        label: 'Access Requests',
        icon: ShieldCheck,
        href: '/agency/access-requests',
    },
    { label: 'Archive', icon: Archive, href: '/agency/archive' },
    { label: 'Analytics', icon: BarChart3, href: '/agency/analytics' },
    { label: 'Notifications', icon: Bell, href: '/agency/notifications' },
    { label: 'Agency Profile', icon: Building2, href: '/agency/profile' },
    { label: 'Settings', icon: Settings, href: '/agency/settings' },
];

const SIDEBAR_COLLAPSED_KEY = 'rikms-agency-sidebar-collapsed';

function getStoredSidebarCollapsed() {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}

function getAgencyInitials(agencyName: string) {
    const initials = agencyName
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return initials || 'AA';
}

export default function AgencyAdminLayout({
    children,
    session,
    search,
    onSearchChange,
}: AgencyAdminLayoutProps) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const [isCollapsed, setIsCollapsed] = useState(getStoredSidebarCollapsed);

    const agencyInitials = getAgencyInitials(session.agencyName);

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    }, [isCollapsed]);

    const toggleSidebar = () => {
        setIsCollapsed((currentValue) => !currentValue);
    };

    const handleSignOut = () => {
        clearAgencySession();
        router.post('/logout', {}, { onFinish: () => router.visit('/agency/login') });
    };

    const openNotifications = () => {
        router.visit('/agency/notifications');
    };

    const openAgencyProfile = () => {
        router.visit('/agency/profile');
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] text-[#101828]">
            <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[#e5e7eb] bg-white px-4 lg:px-6">
                <div
                    className={cn(
                        'flex items-center gap-4 transition-all duration-300',
                        isCollapsed ? 'lg:w-20' : 'lg:w-[216px]',
                    )}
                >
                    <Link
                        href="/agency/dashboard"
                        className={cn(
                            'flex items-center gap-2',
                            isCollapsed && 'lg:justify-center',
                        )}
                        aria-label="RIKMS dashboard"
                    >
                        <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#1e3a8a] text-white">
                            <BookOpen className="size-4" />
                        </span>
                        <span
                            className={cn(
                                'text-[15.2px] leading-[22.8px] font-bold text-[#1e3a8a] transition-opacity duration-200',
                                isCollapsed && 'lg:hidden',
                            )}
                        >
                            RIKMS
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="hidden size-7 items-center justify-center rounded-[10px] text-[#6a7282] hover:bg-[#f3f4f6] lg:flex"
                        aria-label={
                            isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                        title={
                            isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                    >
                        {isCollapsed ? (
                            <ChevronsRight className="size-4" />
                        ) : (
                            <ChevronsLeft className="size-4" />
                        )}
                    </button>
                </div>

                <div className="flex min-w-0 flex-1 justify-center px-4">
                    <div className="relative w-full max-w-[420px]">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                        <input
                            value={search}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f3f4f6] pr-4 pl-10 text-sm text-[#1e2939] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Search research records..."
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={openNotifications}
                        className="relative flex size-9 items-center justify-center rounded-[10px] text-[#4a5565] hover:bg-[#f3f4f6]"
                        aria-label="Notifications"
                    >
                        <Bell className="size-5" />
                        <span className="absolute top-1.5 right-2 size-2 rounded-full bg-[#fb2c36]" />
                    </button>
                    <button
                        type="button"
                        onClick={openAgencyProfile}
                        className="hidden h-12 items-center gap-2 rounded-[10px] px-3 hover:bg-[#f9fafb] sm:flex"
                        aria-label="Open agency profile"
                    >
                        <span className="flex size-8 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
                            AD
                        </span>
                        <span className="text-left">
                            <span className="block text-sm leading-5 font-medium text-[#1e2939]">
                                Agency Admin
                            </span>
                            <span className="block text-xs leading-4 font-medium text-[#6a7282]">
                                {session.agencyName}
                            </span>
                        </span>
                        <ChevronDown className="size-4 text-[#6a7282]" />
                    </button>
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex size-9 items-center justify-center rounded-[10px] text-[#4a5565] hover:bg-[#f3f4f6]"
                        aria-label="Sign out"
                    >
                        <LogOut className="size-4" />
                    </button>
                </div>
            </header>

            <div className="flex">
                <aside
                    className={cn(
                        'sticky top-16 hidden h-[calc(100vh-64px)] shrink-0 flex-col border-r border-[#e5e7eb] bg-white transition-all duration-300 lg:flex',
                        isCollapsed ? 'w-20' : 'w-60',
                    )}
                >
                    <nav
                        className={cn(
                            'flex-1 space-y-1 pt-4 transition-all duration-300',
                            isCollapsed ? 'px-3' : 'px-4',
                        )}
                    >
                        {navItems.map((item) => {
                            const isActive = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    aria-label={item.label}
                                    title={isCollapsed ? item.label : undefined}
                                    className={cn(
                                        'flex h-10 w-full items-center rounded-[10px] text-sm transition-colors',
                                        isActive
                                            ? 'bg-[rgba(30,58,138,0.1)] font-semibold text-[#1e3a8a]'
                                            : 'text-[#4a5565] hover:bg-[#f9fafb]',
                                        isCollapsed
                                            ? 'justify-center px-0'
                                            : 'gap-3 px-3',
                                    )}
                                >
                                    <item.icon className="size-[18px] shrink-0" />
                                    {!isCollapsed && (
                                        <span className="truncate">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div
                        className={cn(
                            'border-t border-[#f3f4f6] transition-all duration-300',
                            isCollapsed ? 'p-3' : 'p-4',
                        )}
                    >
                        <div
                            className={cn(
                                'rounded-[10px] bg-[#f9fafb]',
                                isCollapsed
                                    ? 'flex items-center justify-center p-2'
                                    : 'p-3',
                            )}
                        >
                            {isCollapsed ? (
                                <span
                                    className="flex size-10 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-semibold text-white"
                                    title={`Logged in as ${session.agencyName}`}
                                    aria-label={`Logged in as ${session.agencyName}`}
                                >
                                    {agencyInitials}
                                </span>
                            ) : (
                                <>
                                    <p className="text-xs leading-4 text-[#6a7282]">
                                        Logged in as
                                    </p>
                                    <p className="mt-1 text-xs leading-4 font-semibold text-[#1e3a8a]">
                                        {session.agencyName}
                                    </p>
                                    <p className="mt-1 truncate text-[11px] leading-4 text-[#6a7282]">
                                        Department of Science and Technology
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </aside>

                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </div>
    );
}
