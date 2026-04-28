import { Head, Link, router } from '@inertiajs/react';
import {
    BarChart3,
    Clock3,
    FileText,
    FolderLock,
    LogOut,
    Search,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { clearAgencySession, getAgencySession } from '@/lib/auth/agency-auth';
import type { AgencyAuthSession } from '@/types/auth';

const summaryCards = [
    {
        label: 'Research Records',
        value: '148',
        description: 'Published and draft records under agency oversight',
        icon: FileText,
    },
    {
        label: 'Pending Submissions',
        value: '12',
        description: 'Research items awaiting metadata completion or review',
        icon: Clock3,
    },
    {
        label: 'Restricted Records',
        value: '9',
        description: 'Records with controlled access or approval requirements',
        icon: FolderLock,
    },
    {
        label: 'Usage Overview',
        value: '2.4k',
        description: 'Research views and downloads recorded this quarter',
        icon: BarChart3,
    },
];

export default function AgencyDashboardPage() {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] text-[#6b7280] [font-family:Inter,sans-serif]">
                Preparing your agency workspace...
            </div>
        );
    }

    const handleSignOut = () => {
        clearAgencySession();
        router.visit('/agency/login');
    };

    return (
        <>
            <Head title="Agency Dashboard" />

            <div className="min-h-screen bg-[#f9fafb] text-[#0f172a] [font-family:Inter,sans-serif]">
                <header className="border-b border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:flex-nowrap">
                        <div>
                            <p className="text-sm font-medium text-[#1e3a8a]">
                                Agency Admin Portal
                            </p>
                            <h1 className="text-2xl font-bold text-[#111827]">
                                {session?.agencyName ?? 'Agency'} Dashboard
                            </h1>
                        </div>

                        <div className="relative ml-auto w-full max-w-sm lg:w-auto lg:flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9ca3af]" />
                            <div className="flex h-11 items-center rounded-[10px] border border-[#e5e7eb] bg-white px-10 text-sm text-[#9ca3af]">
                                Search research records, submissions, or authors
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="text-sm font-medium text-[#1e3a8a] hover:underline"
                            >
                                Public Portal
                            </Link>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSignOut}
                                className="rounded-[10px] border-[#dbe4f0] text-[#1e3a8a]"
                            >
                                <LogOut className="size-4" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-10">
                    <section className="rounded-[18px] bg-[#1e3a8a] px-8 py-10 text-white shadow-[0px_20px_45px_-24px_rgba(30,58,138,0.6)]">
                        <p className="text-sm font-medium text-[#bedbff]">
                            Signed in as {session?.email}
                        </p>
                        <h2 className="mt-2 max-w-2xl text-3xl font-bold">
                            Your agency workspace is ready for research governance.
                        </h2>
                        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[rgba(255,255,255,0.76)]">
                            This frontend checkpoint confirms the mock agency sign-in
                            flow is connected. The production Laravel authentication
                            endpoint can later replace the temporary client-side auth
                            service without changing the page structure.
                        </p>
                    </section>

                    <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                            <article
                                key={card.label}
                                className="rounded-[16px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-[#6b7280]">
                                        {card.label}
                                    </p>
                                    <card.icon className="size-5 text-[#1e3a8a]" />
                                </div>
                                <p className="mt-4 text-4xl font-bold text-[#111827]">
                                    {card.value}
                                </p>
                                <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                                    {card.description}
                                </p>
                            </article>
                        ))}
                    </section>
                </main>
            </div>
        </>
    );
}
