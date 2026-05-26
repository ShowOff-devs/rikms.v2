import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import {
    getPublicAgencyTypes,
    searchPublicAgencies,
} from '@/lib/public/agency-service';
import type { PublicAgency, PublicAgencyKind } from '@/types/public-agency';

const categoryMeta: Record<
    PublicAgencyKind,
    {
        iconBg: string;
        pillBg: string;
        pillText: string;
    }
> = {
    'Government Agency': {
        iconBg: 'bg-[#eff6ff]',
        pillBg: 'bg-[#dbeafe]',
        pillText: 'text-[#1447e6]',
    },
    'Research Consortium': {
        iconBg: 'bg-[#ecfdf5]',
        pillBg: 'bg-[#d0fae5]',
        pillText: 'text-[#007a55]',
    },
    'Higher Education Institution': {
        iconBg: 'bg-[#faf5ff]',
        pillBg: 'bg-[#f3e8ff]',
        pillText: 'text-[#8200db]',
    },
};

type TypeFilter = PublicAgencyKind | 'all';

export default function Agencies() {
    const [search, setSearch] = useState('');
    const [type, setType] = useState<TypeFilter>('all');
    const [types, setTypes] = useState<PublicAgencyKind[]>([]);
    const [agencies, setAgencies] = useState<PublicAgency[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCurrent = true;

        getPublicAgencyTypes()
            .then((nextTypes) => {
                if (isCurrent) {
                    setTypes(nextTypes);
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setTypes([]);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        let isCurrent = true;

        searchPublicAgencies({ search, type })
            .then((nextAgencies) => {
                if (isCurrent) {
                    setAgencies(nextAgencies);
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setAgencies([]);
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [search, type]);

    return (
        <>
            <Head title="Participating Agencies" />

            <div className="min-h-screen bg-[#f9fafb] text-[#0f172a]">
                <PortalNavbar activeNav="agencies" />

                <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
                    <section>
                        <h1 className="text-[28px] leading-[42px] font-bold text-[#1e3a8a]">
                            Participating Agencies in Davao Region
                        </h1>
                        <p className="mt-2 max-w-[768px] text-base leading-6 text-[#6b7280]">
                            Explore government agencies, research institutions,
                            and regional R&amp;D consortia contributing research
                            to the Regionwide Integrated Knowledge Management
                            System.
                        </p>
                    </section>

                    <section className="mt-8 rounded-[14px] border border-[#f3f4f6] bg-white p-[21px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9ca3af]" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search agencies"
                                aria-label="Search agencies"
                                className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#111827] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {(['all', ...types] as TypeFilter[]).map(
                                (nextType) => (
                                    <button
                                        key={nextType}
                                        type="button"
                                        onClick={() => setType(nextType)}
                                        className={
                                            nextType === type
                                                ? 'rounded-full bg-[#1e3a8a] px-3 py-1.5 text-sm leading-5 font-medium text-white'
                                                : 'rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm leading-5 font-medium text-[#6b7280] hover:bg-[#eff6ff] hover:text-[#1e3a8a]'
                                        }
                                    >
                                        {nextType === 'all' ? 'All' : nextType}
                                    </button>
                                ),
                            )}
                        </div>
                    </section>

                    <p className="mt-8 text-sm leading-5 text-[#6b7280]">
                        {isLoading ? 'Loading agencies' : 'Showing'}{' '}
                        {agencies.length} agenc
                        {agencies.length === 1 ? 'y' : 'ies'}
                    </p>

                    {agencies.length === 0 ? (
                        <section className="mt-4 rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-10 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                            <h2 className="text-base font-semibold text-[#1e3a8a]">
                                No agencies found
                            </h2>
                            <p className="mt-2 text-sm text-[#6b7280]">
                                Try a different keyword or clear the selected
                                filter.
                            </p>
                        </section>
                    ) : null}

                    <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {agencies.map((agency) => {
                            const meta = categoryMeta[agency.type];

                            return (
                                <article
                                    key={agency.slug}
                                    className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 pt-6 pb-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span
                                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] ${meta.iconBg}`}
                                        >
                                            <Building2 className="size-7 text-[#1e3a8a]" />
                                        </span>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs leading-4 font-medium ${meta.pillBg} ${meta.pillText}`}
                                        >
                                            {agency.type}
                                        </span>
                                    </div>

                                    <h2 className="mt-4 text-base leading-6 font-semibold text-[#1e3a8a]">
                                        {agency.name}
                                    </h2>
                                    <p className="mt-1 min-h-[38.5px] text-sm leading-[19.25px] text-[#6b7280]">
                                        {agency.fullName}
                                    </p>
                                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#6b7280]">
                                        {agency.description}
                                    </p>
                                    <p className="mt-4 text-sm leading-5 font-medium text-[#6b7280]">
                                        {agency.publications} Research
                                        Publications
                                    </p>

                                    <Link
                                        href={`/agencies/${agency.slug}`}
                                        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white"
                                    >
                                        <span>View Agency Profile</span>
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </article>
                            );
                        })}
                    </section>
                </main>

                <PortalFooter />
            </div>
        </>
    );
}
