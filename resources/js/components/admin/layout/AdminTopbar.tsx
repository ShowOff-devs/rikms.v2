import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Search,
    Settings,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { visibleAdminNavItems } from '@/components/admin/layout/AdminSidebar';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type AdminTopbarProps = {
    isSidebarCollapsed: boolean;
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    unreadNotificationsCount: number;
};

export function AdminTopbar({
    isSidebarCollapsed,
    search,
    onSearchChange,
    searchPlaceholder = 'Search this page...',
    unreadNotificationsCount,
}: AdminTopbarProps) {
    const { auth } = usePage().props;
    const navigationItems = visibleAdminNavItems(auth.adminPermissions);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusSearch = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', focusSearch);

        return () => window.removeEventListener('keydown', focusSearch);
    }, []);

    const handleSignOut = () => {
        router.post(
            '/logout',
            {},
            { onFinish: () => router.visit('/admin/login') },
        );
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center border-b border-white/10 bg-[#0f172a] px-4 text-white lg:px-0 lg:pr-6">
            <div className="mr-2 lg:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-[10px] text-white/80 transition hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-[#ffb900] focus-visible:outline-none"
                            aria-label="Open administration navigation"
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-[min(20rem,85vw)] gap-0 border-white/10 bg-[#0f172a] p-0 text-white"
                    >
                        <SheetHeader className="border-b border-white/10 p-5 text-left">
                            <SheetTitle className="text-white">
                                System Administration
                            </SheetTitle>
                            <SheetDescription className="text-sm text-white/60">
                                Navigate the RIKMS administration portal.
                            </SheetDescription>
                        </SheetHeader>
                        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                            {navigationItems.map((item) => (
                                <SheetClose asChild key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                                    >
                                        <item.icon
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                </SheetClose>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
            <Link
                href="/admin/dashboard"
                className={cn(
                    'flex shrink-0 items-center gap-2.5 transition-all duration-300 lg:h-16 lg:px-6',
                    isSidebarCollapsed
                        ? 'lg:w-16 lg:justify-center lg:px-0'
                        : 'lg:w-60',
                )}
                aria-label="RIKMS System Administration"
                title="RIKMS System Administration"
            >
                <span className="admin-logo-tile flex size-9 items-center justify-center rounded-[10px] bg-white p-1">
                    <AppLogoIcon className="size-8" />
                </span>
                <span
                    className={cn(
                        'hidden min-w-0 transition-opacity duration-200 md:block',
                        isSidebarCollapsed && 'lg:hidden',
                    )}
                >
                    <span className="block text-[13.6px] leading-4 font-bold tracking-normal text-white">
                        RIKMS
                    </span>
                    <span className="block text-[10.4px] leading-4 font-medium text-white/40">
                        System Administration
                    </span>
                </span>
            </Link>

            <div className="flex min-w-0 flex-1 justify-center px-4">
                <div className="relative w-full max-w-[576px]">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40"
                        aria-hidden="true"
                    />
                    <input
                        ref={searchInputRef}
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-[42px] w-full rounded-[10px] border border-white/10 bg-white/[0.07] pr-14 pl-10 text-sm text-white transition outline-none placeholder:text-white/40 focus:border-[#ffb900]/50 focus:ring-2 focus:ring-[#ffb900]/10"
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                    />
                    <kbd className="pointer-events-none absolute top-1/2 right-3 hidden h-[21px] -translate-y-1/2 items-center rounded-[4px] border border-white/10 bg-white/[0.05] px-[7px] font-mono text-[10px] leading-[15px] text-white/40 sm:inline-flex">
                        Ctrl K
                    </kbd>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <Link
                    href="/admin/audit-logs"
                    className="relative flex size-9 items-center justify-center rounded-[10px] text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                    aria-label="System notifications"
                    title="System notifications"
                >
                    <Bell className="size-5" aria-hidden="true" />
                    {unreadNotificationsCount > 0 && (
                        <>
                            <span
                                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#fb2c36]"
                                aria-hidden="true"
                            />
                            <span className="sr-only">
                                {unreadNotificationsCount} unread notifications
                            </span>
                        </>
                    )}
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Open account menu for ${auth.user.name}`}
                            className="flex h-11 items-center gap-2 rounded-[10px] px-2 text-left transition hover:bg-white/[0.07]"
                        >
                            <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#fe9a00]/20 text-[#ffb900]">
                                <UserRound
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <span className="hidden text-sm leading-5 font-medium text-white/80 sm:block">
                                {auth.user.name}
                            </span>
                            <ChevronDown
                                className="hidden size-3.5 text-white/40 sm:block"
                                aria-hidden="true"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{auth.user.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/admin/security">
                                <ShieldCheck className="size-4" />
                                Security Center
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings">
                                <Settings className="size-4" />
                                Platform Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings/profile">
                                <UserRound className="size-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <button type="button" onClick={handleSignOut}>
                                <LogOut className="size-4" />
                                Sign out
                            </button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
