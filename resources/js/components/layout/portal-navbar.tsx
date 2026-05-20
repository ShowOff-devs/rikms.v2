import { Link, router } from '@inertiajs/react';
import { BookOpen, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type NavKey = 'browse-research' | 'agencies' | 'about' | 'login';

type PortalNavbarProps = {
    activeNav?: NavKey;
};

const navigationItems: Array<{
    key: NavKey;
    label: string;
    href: string;
}> = [
    {
        key: 'browse-research',
        label: 'Browse Research',
        href: '/browse-research',
    },
    { key: 'agencies', label: 'Agencies', href: '/agencies' },
    { key: 'about', label: 'About', href: '/about' },
    { key: 'login', label: 'Login', href: '/agency/login' },
];

export default function PortalNavbar({
    activeNav = 'login',
}: PortalNavbarProps) {
    const [query, setQuery] = useState('');

    const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedQuery = query.trim();

        router.visit(
            trimmedQuery
                ? `/browse-research?q=${encodeURIComponent(trimmedQuery)}`
                : '/browse-research',
        );
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="mx-auto flex min-h-16 w-full max-w-[1552px] flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap lg:px-6 lg:py-0 xl:px-11 2xl:px-[176px]">
                <Link href="/" className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#1e3a8a] text-white">
                        <BookOpen className="size-[15px]" strokeWidth={2.2} />
                    </span>
                    <span className="text-[17.6px] leading-[26.4px] font-bold tracking-[-0.44px] text-[#1e3a8a]">
                        RIKMS
                    </span>
                </Link>

                <form
                    onSubmit={handleSearch}
                    role="search"
                    className="relative order-3 w-full lg:order-none lg:ml-8 lg:w-[448px] 2xl:ml-[142px]"
                >
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#111827] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Search research, keywords, agencies, or SDGs"
                        aria-label="Search research, keywords, agencies, or SDGs"
                    />
                </form>

                <nav className="ml-auto flex items-center gap-1">
                    {navigationItems.map((item) => {
                        const isActive = item.key === activeNav;

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={cn(
                                    'rounded-[8px] px-3 py-2 text-sm leading-5 transition-colors',
                                    isActive
                                        ? 'rounded-[10px] bg-[#1e3a8a] text-white'
                                        : 'text-[#6b7280] hover:bg-[#eff6ff] hover:text-[#1e3a8a]',
                                )}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
