import { Link, router } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    LogOut,
    Search,
    Settings,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type AdminTopbarProps = {
    isSidebarCollapsed: boolean;
    search: string;
    onSearchChange: (value: string) => void;
};

export function AdminTopbar({
    isSidebarCollapsed,
    search,
    onSearchChange,
}: AdminTopbarProps) {
    const handleSignOut = () => {
        router.post('/logout', {}, { onFinish: () => router.visit('/admin/login') });
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center border-b border-white/10 bg-[#0f172a] px-4 text-white lg:px-0 lg:pr-6">
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
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#fe9a00]/20 text-[#ffb900]">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <span
                    className={cn(
                        'min-w-0 transition-opacity duration-200',
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
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-[42px] w-full rounded-[10px] border border-white/10 bg-white/[0.07] pr-14 pl-10 text-sm text-white transition outline-none placeholder:text-white/40 focus:border-[#ffb900]/50 focus:ring-2 focus:ring-[#ffb900]/10"
                        placeholder="Search agencies, users, or research records..."
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
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#fb2c36]" />
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[10px] px-2 text-left transition hover:bg-white/[0.07]"
                        >
                            <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#fe9a00]/20 text-[#ffb900]">
                                <UserRound
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <span className="hidden text-sm leading-5 font-medium text-white/80 sm:block">
                                Super Admin
                            </span>
                            <ChevronDown
                                className="hidden size-3.5 text-white/40 sm:block"
                                aria-hidden="true"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Super Admin</DropdownMenuLabel>
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
                            <Link href="/admin/settings">
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
