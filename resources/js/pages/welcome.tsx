import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Calendar,
    Database,
    Download,
    FileText,
    Search,
    Users,
} from 'lucide-react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import { mockResearchRecords, sdgColors } from '@/data/mock-research';
import { getPublicAgencies } from '@/lib/public/agency-service';

const heroBackgroundImage =
    '/assets/figma/6ef85a09-2403-46c7-bba0-94f5422c5ac1.jpg';

const sdgCards = Array.from({ length: 17 }, (_, index) => {
    const label = `SDG ${index + 1}`;

    return {
        number: String(index + 1),
        label,
        color: sdgColors[label],
        count: mockResearchRecords.filter((record) =>
            record.sdgs.includes(label),
        ).length,
    };
});

export default function Welcome() {
    const featuredResearch = mockResearchRecords.slice(0, 6);
    const agencies = getPublicAgencies();

    return (
        <>
            <Head title="RIKMS" />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar />

                <section className="relative overflow-hidden bg-[#1e3a8a]">
                    <img
                        src={heroBackgroundImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-15"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[rgba(30,58,138,0.95)] to-[rgba(30,58,138,0.72)]" />
                    <div className="relative mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-24">
                        <h1 className="max-w-[680px] text-4xl leading-[1.15] font-bold text-white">
                            Regionwide Integrated Knowledge Management System
                        </h1>
                        <p className="mt-4 max-w-[640px] text-lg leading-8 text-[#dbeafe]">
                            A regional platform for discovering validated
                            research studies across government agencies,
                            research consortia, and institutions in the Davao
                            Region.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/browse-research"
                                className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-6 text-sm font-semibold text-[#1e3a8a]"
                            >
                                <Search className="size-4" />
                                Browse Research
                            </Link>
                            <Link
                                href="/agencies"
                                className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/40 bg-white/15 px-6 text-sm font-semibold text-white"
                            >
                                <Building2 className="size-4" />
                                View Participating Agencies
                            </Link>
                            <Link
                                href="/about"
                                className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/30 px-6 text-sm font-semibold text-white"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="relative z-10 -mt-8 mx-auto w-full max-w-[1200px] px-4 sm:px-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                value: mockResearchRecords.length,
                                label: 'Public Research Records',
                                icon: FileText,
                            },
                            {
                                value: agencies.length,
                                label: 'Participating Agencies',
                                icon: Users,
                            },
                            {
                                value: 17,
                                label: 'SDGs Represented',
                                icon: Database,
                            },
                            {
                                value: mockResearchRecords.filter(
                                    (record) =>
                                        record.publicationYear >= 2025,
                                ).length,
                                label: 'Latest Publications',
                                icon: Calendar,
                            },
                        ].map((stat) => {
                            const Icon = stat.icon;

                            return (
                                <article
                                    key={stat.label}
                                    className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
                                        <Icon className="size-6" />
                                    </div>
                                    <p className="mt-3 text-[42px] leading-[42px] font-bold text-[#1e3a8a]">
                                        {stat.value}
                                    </p>
                                    <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                                        {stat.label}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="mx-auto mt-16 w-full max-w-[1200px] px-4 sm:px-6">
                    <div className="text-center">
                        <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                            Research Contributions to the Sustainable
                            Development Goals
                        </h2>
                        <p className="mx-auto mt-2 max-w-[766px] text-base leading-6 text-[#6b7280]">
                            RIKMS categorizes studies according to the United
                            Nations Sustainable Development Goals to highlight
                            regional research contributions.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {sdgCards.map((card) => (
                            <Link
                                key={card.number}
                                href={`/browse-research?sdg=${encodeURIComponent(card.label)}`}
                                className="min-h-40 rounded-[14px] px-5 py-5 text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5"
                                style={{ backgroundColor: card.color }}
                            >
                                <p className="text-[32px] leading-8 font-bold text-white/65">
                                    {card.number}
                                </p>
                                <p className="mt-4 text-sm leading-5 font-semibold">
                                    {card.label}
                                </p>
                                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
                                    <FileText className="size-3" />
                                    <span className="text-xs font-medium text-white/90">
                                        {card.count} records
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="mt-16 bg-white py-16">
                    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
                        <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                            <div>
                                <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                                    Featured Research
                                </h2>
                                <p className="mt-1 text-base leading-6 text-[#6b7280]">
                                    Latest and most impactful research
                                    publications
                                </p>
                            </div>
                            <Link
                                href="/browse-research"
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#1e3a8a]"
                            >
                                View all research
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {featuredResearch.map((item) => (
                                <article
                                    key={item.id}
                                    className="flex min-h-[304px] flex-col rounded-[14px] border border-[#f3f4f6] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {item.tags.map((tag) => (
                                            <span
                                                key={`${item.id}-${tag.label}`}
                                                className={
                                                    tag.type === 'category'
                                                        ? 'rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#6b7280]'
                                                        : 'rounded-full px-2 py-0.5 text-xs font-medium text-white'
                                                }
                                                style={{
                                                    backgroundColor:
                                                        tag.type === 'sdg'
                                                            ? tag.color
                                                            : undefined,
                                                }}
                                            >
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="line-clamp-3 text-base leading-[22px] font-semibold text-[#1e3a8a]">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-2 text-xs leading-4 text-[#6b7280]">
                                        {item.authors.join(', ')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                                        <span className="inline-flex items-center gap-1">
                                            <Building2 className="size-3" />
                                            {item.agency}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar className="size-3" />
                                            {item.publicationYear}
                                        </span>
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm leading-5 text-[#6b7280]">
                                        {item.abstract}
                                    </p>
                                    <Link
                                        href={`/browse-research/${item.id}`}
                                        className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-[#1e3a8a]"
                                    >
                                        View Research
                                        <ArrowRight className="size-3" />
                                    </Link>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-16">
                    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
                        <div className="text-center">
                            <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                                Participating Agencies in Davao Region
                            </h2>
                            <p className="mt-2 text-base leading-6 text-[#6b7280]">
                                Government agencies and research consortia
                                contributing to the regional knowledge base.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {agencies.map((agency) => (
                                <Link
                                    key={agency.slug}
                                    href={`/agencies/${agency.slug}`}
                                    className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5"
                                >
                                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
                                        <Building2 className="size-7" />
                                    </div>
                                    <h3 className="mt-3 text-xl font-semibold text-[#1e3a8a]">
                                        {agency.name}
                                    </h3>
                                    <p className="mt-2 min-h-8 text-xs leading-4 text-[#6b7280]">
                                        {agency.fullName}
                                    </p>
                                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#6b7280]">
                                        <Download className="size-3" />
                                        {agency.publications} publications
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <PortalFooter />
            </div>
        </>
    );
}
