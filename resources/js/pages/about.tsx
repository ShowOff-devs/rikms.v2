import { Head, Link } from '@inertiajs/react';
import { BookOpen, Database, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import { getPublicAgencies } from '@/lib/public/agency-service';
import type { PublicAgency } from '@/types/public-agency';

const objectives = [
    {
        title: 'Research Accessibility',
        description:
            'Provide a centralized public entry point for validated regional research metadata and open-access outputs.',
        icon: BookOpen,
    },
    {
        title: 'Knowledge Sharing',
        description:
            'Promote collaboration and knowledge exchange among government agencies, consortia, and academic institutions.',
        icon: Users,
    },
    {
        title: 'Data Integrity',
        description:
            'Keep public research information consistent, traceable, and aligned with agency-owned records.',
        icon: Database,
    },
    {
        title: 'Responsible Access',
        description:
            'Support open discovery while respecting restricted, embargoed, and external-source access conditions.',
        icon: ShieldCheck,
    },
];

export default function About() {
    const [agencies, setAgencies] = useState<PublicAgency[]>([]);

    useEffect(() => {
        let isCurrent = true;

        getPublicAgencies()
            .then((nextAgencies) => {
                if (isCurrent) {
                    setAgencies(nextAgencies);
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setAgencies([]);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    return (
        <>
            <Head title="About RIKMS" />

            <div className="min-h-screen bg-[#f9fafb] text-[#0f172a]">
                <PortalNavbar activeNav="about" />

                <section className="bg-[#1e3a8a] py-16">
                    <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
                        <h1 className="mx-auto max-w-[760px] text-[30px] leading-[37.5px] font-bold text-white">
                            About the Regionwide Integrated Knowledge Management
                            System
                        </h1>
                        <p className="mx-auto mt-4 max-w-[766px] text-base leading-[26px] text-[#dbeafe]">
                            RIKMS is a centralized digital platform for
                            discovering, organizing, and sharing validated
                            research studies across the Davao Region.
                        </p>
                    </div>
                </section>

                <main className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
                    <section className="grid gap-10 lg:grid-cols-2">
                        <div>
                            <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                                What is RIKMS?
                            </h2>
                            <p className="mt-4 text-base leading-[26px] text-[#374151]">
                                The Regionwide Integrated Knowledge Management
                                System serves as a public-facing research
                                repository for studies conducted by government
                                agencies, research consortia, and academic
                                institutions within the Davao Region.
                            </p>
                            <p className="mt-4 text-base leading-[26px] text-[#374151]">
                                The platform improves research visibility,
                                supports evidence-based decision-making, and
                                helps stakeholders find public metadata, agency
                                profiles, and access instructions from a single
                                trusted portal.
                            </p>
                        </div>
                        <article className="rounded-[14px] border border-[#f3f4f6] bg-white px-8 py-10 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
                                <BookOpen className="size-10" />
                            </div>
                            <h3 className="mx-auto mt-4 max-w-[302px] text-[17.6px] leading-[26.4px] font-semibold text-[#1e3a8a]">
                                Knowledge-Driven Regional Development
                            </h3>
                            <p className="mx-auto mt-3 max-w-[302px] text-sm leading-5 text-[#6b7280]">
                                Empowering innovation through accessible
                                research and cross-institutional collaboration.
                            </p>
                        </article>
                    </section>

                    <section className="mt-16 grid gap-6 md:grid-cols-2">
                        <article className="rounded-[14px] border border-[#f3f4f6] bg-white p-8 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                            <h2 className="text-[20px] leading-[30px] font-bold text-[#1e3a8a]">
                                Vision
                            </h2>
                            <p className="mt-4 text-base leading-[26px] text-[#374151]">
                                To become a trusted regional knowledge platform
                                that promotes research collaboration,
                                innovation, and evidence-based development.
                            </p>
                        </article>
                        <article className="rounded-[14px] border border-[#f3f4f6] bg-white p-8 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                            <h2 className="text-[20px] leading-[30px] font-bold text-[#1e3a8a]">
                                Mission
                            </h2>
                            <p className="mt-4 text-base leading-[26px] text-[#374151]">
                                To provide a secure and accessible public
                                platform for discovering research studies that
                                support sustainable development and regional
                                growth.
                            </p>
                        </article>
                    </section>

                    <section className="mt-16">
                        <div className="text-center">
                            <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                                System Objectives
                            </h2>
                            <p className="mt-2 text-base leading-6 text-[#6b7280]">
                                The core goals driving the public RIKMS portal.
                            </p>
                        </div>
                        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            {objectives.map((objective) => {
                                const Icon = objective.icon;

                                return (
                                    <article
                                        key={objective.title}
                                        className="rounded-[14px] border border-[#f3f4f6] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                    >
                                        <span className="flex size-12 items-center justify-center rounded-[14px] bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
                                            <Icon className="size-6" />
                                        </span>
                                        <h3 className="mt-4 text-base font-semibold text-[#1e3a8a]">
                                            {objective.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-[22px] text-[#6b7280]">
                                            {objective.description}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mt-16">
                        <div className="text-center">
                            <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                                Participating Institutions
                            </h2>
                            <p className="mt-2 text-base leading-6 text-[#6b7280]">
                                Government agencies, research consortia, and
                                academic institutions in the Davao Region.
                            </p>
                        </div>
                        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {agencies.map((agency) => (
                                <Link
                                    key={agency.slug}
                                    href={`/agencies/${agency.slug}`}
                                    className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
                                        <Users className="size-7" />
                                    </span>
                                    <h3 className="mt-4 text-sm font-semibold text-[#1e3a8a]">
                                        {agency.name}
                                    </h3>
                                    <p className="mt-1 text-xs leading-4 text-[#6b7280]">
                                        {agency.fullName}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                </main>

                <section className="bg-[#1e3a8a] px-4 py-16 text-center sm:px-6">
                    <h2 className="text-[24px] leading-9 font-bold text-white">
                        Advancing Research in the Davao Region
                    </h2>
                    <p className="mx-auto mt-3 max-w-[672px] text-base leading-[26px] text-[#dbeafe]">
                        Browse public research metadata, discover contributing
                        institutions, and request access where records require
                        agency approval.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            href="/browse-research"
                            className="inline-flex h-11 items-center rounded-[10px] bg-white px-5 text-sm font-semibold text-[#1e3a8a]"
                        >
                            Browse Research
                        </Link>
                        <Link
                            href="/agencies"
                            className="inline-flex h-11 items-center rounded-[10px] border border-white/40 px-5 text-sm font-semibold text-white"
                        >
                            View Agencies
                        </Link>
                    </div>
                </section>

                <PortalFooter />
            </div>
        </>
    );
}
