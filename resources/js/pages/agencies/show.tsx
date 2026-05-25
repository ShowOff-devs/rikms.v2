import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    ExternalLink,
    Mail,
    MapPin,
} from 'lucide-react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import ResearchCard from '@/components/research/ResearchCard';
import ResearchEmptyState from '@/components/research/ResearchEmptyState';
import {
    findPublicAgency,
    getResearchForAgency,
} from '@/lib/public/agency-service';

type AgencyProfilePageProps = {
    agencySlug?: string;
};

const getAgencySlugFromPath = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return decodeURIComponent(window.location.pathname.split('/').pop() ?? '');
};

export default function AgencyProfilePage({
    agencySlug,
}: AgencyProfilePageProps) {
    const slug = agencySlug ?? getAgencySlugFromPath();
    const agency = findPublicAgency(slug);
    const research = agency ? getResearchForAgency(agency.name) : [];

    return (
        <>
            <Head title={agency ? `${agency.name} Profile` : 'Agency Profile'} />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar activeNav="agencies" />

                <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
                    <Link
                        href="/agencies"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#1e3a8a] hover:underline"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Agencies
                    </Link>

                    {!agency ? (
                        <div className="mt-6">
                            <ResearchEmptyState
                                title="Agency profile not found"
                                description="The selected agency profile may have been moved or is not available in the public directory."
                                actionLabel="Return to agencies"
                                onAction={() => {
                                    window.location.href = '/agencies';
                                }}
                            />
                        </div>
                    ) : (
                        <>
                            <section className="mt-6 rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                                    <span className="flex size-20 shrink-0 items-center justify-center rounded-[18px] bg-[#eff6ff] text-[#1e3a8a]">
                                        <Building2 className="size-10" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="inline-flex rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-medium text-[#1447e6]">
                                            {agency.type}
                                        </p>
                                        <h1 className="mt-3 text-[28px] leading-9 font-bold text-[#1e3a8a]">
                                            {agency.name}
                                        </h1>
                                        <p className="mt-1 text-base leading-6 text-[#374151]">
                                            {agency.fullName}
                                        </p>
                                        <p className="mt-4 max-w-[820px] text-sm leading-6 text-[#6b7280]">
                                            {agency.description}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="mt-6 grid gap-4 md:grid-cols-3">
                                <article className="rounded-[14px] border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                    <p className="text-sm text-[#6b7280]">
                                        Public research records
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-[#1e3a8a]">
                                        {research.length}
                                    </p>
                                </article>
                                <article className="rounded-[14px] border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                    <p className="text-sm text-[#6b7280]">
                                        Directory publications
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-[#1e3a8a]">
                                        {agency.publications}
                                    </p>
                                </article>
                                <article className="rounded-[14px] border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                    <p className="text-sm text-[#6b7280]">
                                        Contact
                                    </p>
                                    <a
                                        href={`mailto:${agency.contactEmail}`}
                                        className="mt-2 inline-flex min-w-0 items-center gap-2 text-sm font-medium text-[#1e3a8a] hover:underline"
                                    >
                                        <Mail className="size-4 shrink-0" />
                                        <span className="truncate">
                                            {agency.contactEmail}
                                        </span>
                                    </a>
                                </article>
                            </section>

                            <section className="mt-6 rounded-[14px] border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                <h2 className="text-base font-semibold text-[#1e3a8a]">
                                    Public Information
                                </h2>
                                <div className="mt-4 grid gap-3 text-sm text-[#6b7280] md:grid-cols-2">
                                    <p className="inline-flex items-center gap-2">
                                        <MapPin className="size-4 shrink-0 text-[#1e3a8a]" />
                                        {agency.address}
                                    </p>
                                    <a
                                        href={agency.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-[#1e3a8a] hover:underline"
                                    >
                                        <ExternalLink className="size-4 shrink-0" />
                                        Visit public website
                                    </a>
                                </div>
                            </section>

                            <section className="mt-8">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#1e3a8a]">
                                            Related Research
                                        </h2>
                                        <p className="mt-1 text-sm text-[#6b7280]">
                                            Public records associated with{' '}
                                            {agency.name}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/browse-research?agency=${encodeURIComponent(agency.name)}`}
                                        className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#1e3a8a] px-4 text-sm font-medium text-[#1e3a8a]"
                                    >
                                        View all from agency
                                    </Link>
                                </div>

                                <div className="mt-4 space-y-4">
                                    {research.length > 0 ? (
                                        research
                                            .slice(0, 3)
                                            .map((record) => (
                                                <ResearchCard
                                                    key={record.id}
                                                    research={record}
                                                />
                                            ))
                                    ) : (
                                        <ResearchEmptyState
                                            title="No related research yet"
                                            description="This agency does not have public research records in the mock directory."
                                        />
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </main>

                <PortalFooter />
            </div>
        </>
    );
}
