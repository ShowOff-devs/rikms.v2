import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Building2,
    Calendar,
    Database,
    Download,
    FileText,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import { getPublicAgencies } from '@/lib/public/agency-service';
import {
    getPublicPortalSummary,
    sdgColors,
} from '@/lib/research/research-service';
import type { PublicPortalSummary } from '@/lib/research/research-service';
import type { PublicAgency } from '@/types/public-agency';

const heroBackgroundImage =
    '/assets/figma/6ef85a09-2403-46c7-bba0-94f5422c5ac1.jpg';

const defaultSummary: PublicPortalSummary = {
    researchCount: 0,
    agencyCount: 0,
    latestPublicationCount: 0,
    latestPublicationYear: null,
    recentPublicationCount: 0,
    representedSdgCount: 0,
    sdgCards: Array.from({ length: 17 }, (_, index) => {
        const label = `SDG ${index + 1}`;

        return {
            number: String(index + 1),
            label,
            color: sdgColors[label],
            count: 0,
        };
    }),
    featuredResearch: [],
};

const lightSdgCards = new Set(['2', '7', '11', '12']);

function sdgTextColors(number: string) {
    const usesDarkText = lightSdgCards.has(number);

    return {
        primary: usesDarkText ? '#111827' : '#ffffff',
        secondary: usesDarkText
            ? 'rgba(17,24,39,0.72)'
            : 'rgba(255,255,255,0.72)',
        badgeBackground: usesDarkText
            ? 'rgba(17,24,39,0.12)'
            : 'rgba(255,255,255,0.22)',
    };
}

function LandingAgencyLogo({ agency }: { agency: PublicAgency }) {
    const [hasImageError, setHasImageError] = useState(false);

    return (
        <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-full bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
            {agency.logo_url && !hasImageError ? (
                <img
                    src={agency.logo_url}
                    alt={`${agency.short_name || agency.name} logo`}
                    className="size-full object-contain p-2"
                    onError={() => setHasImageError(true)}
                />
            ) : (
                <Building2 className="size-7" />
            )}
        </div>
    );
}

export default function Welcome() {
    const [summary, setSummary] = useState<PublicPortalSummary>(defaultSummary);
    const [agencies, setAgencies] = useState<PublicAgency[]>([]);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isAgenciesLoading, setIsAgenciesLoading] = useState(true);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [agenciesError, setAgenciesError] = useState<string | null>(null);

    const loadSummary = useCallback(async () => {
        setIsSummaryLoading(true);
        setSummaryError(null);

        try {
            setSummary(await getPublicPortalSummary());
        } catch {
            setSummary(defaultSummary);
            setSummaryError('Landing page statistics could not be loaded.');
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    const loadAgencies = useCallback(async () => {
        setIsAgenciesLoading(true);
        setAgenciesError(null);

        try {
            setAgencies(await getPublicAgencies());
        } catch {
            setAgencies([]);
            setAgenciesError('Participating agencies could not be loaded.');
        } finally {
            setIsAgenciesLoading(false);
        }
    }, []);

    const loadLandingData = useCallback(() => {
        void Promise.allSettled([loadSummary(), loadAgencies()]);
    }, [loadAgencies, loadSummary]);

    useEffect(() => {
        loadLandingData();
    }, [loadLandingData]);

    const latestPublicationLabel = summary.latestPublicationYear
        ? `${summary.latestPublicationYear} Publications`
        : 'Latest Year Publications';
    const hasLandingError = Boolean(summaryError || agenciesError);

    return (
        <>
            <Head title="RIKMS">
                <meta
                    name="description"
                    content="Discover validated research studies, SDG contributions, and participating agencies across the Davao Region through RIKMS."
                />
                <meta
                    property="og:title"
                    content="RIKMS | Regionwide Integrated Knowledge Management System"
                />
                <meta
                    property="og:description"
                    content="A regional platform for discovering validated research studies across government agencies, research consortia, and institutions in the Davao Region."
                />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={heroBackgroundImage} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="twitter:title"
                    content="RIKMS | Regionwide Integrated Knowledge Management System"
                />
                <meta
                    name="twitter:description"
                    content="Discover public research records, SDG contributions, and participating agencies in the Davao Region."
                />
            </Head>

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

                {hasLandingError ? (
                    <section
                        className="mx-auto mt-6 w-full max-w-[1200px] px-4 sm:px-6"
                        role="alert"
                    >
                        <div className="flex flex-col gap-3 rounded-[14px] border border-[#bfdbfe] bg-white px-5 py-4 text-sm text-[#1e3a8a] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                                <p>
                                    {[summaryError, agenciesError]
                                        .filter(Boolean)
                                        .join(' ')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={loadLandingData}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-[#bfdbfe] px-3 font-semibold"
                            >
                                <RefreshCw className="size-4" />
                                Try again
                            </button>
                        </div>
                    </section>
                ) : null}

                <section className="relative z-10 mx-auto -mt-8 w-full max-w-[1200px] px-4 sm:px-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                value: isSummaryLoading
                                    ? '...'
                                    : summary.researchCount,
                                label: 'Public Research Records',
                                icon: FileText,
                            },
                            {
                                value: isAgenciesLoading
                                    ? '...'
                                    : summary.agencyCount || agencies.length,
                                label: 'Participating Agencies',
                                icon: Users,
                            },
                            {
                                value: isSummaryLoading
                                    ? '...'
                                    : summary.representedSdgCount,
                                label: 'SDGs Represented',
                                icon: Database,
                            },
                            {
                                value: isSummaryLoading
                                    ? '...'
                                    : summary.latestPublicationCount,
                                label: latestPublicationLabel,
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

                    {isSummaryLoading ? (
                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {Array.from({ length: 10 }, (_, index) => (
                                <div
                                    key={index}
                                    className="min-h-40 animate-pulse rounded-[14px] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {summary.sdgCards.map((card) => {
                                const colors = sdgTextColors(card.number);

                                return (
                                    <Link
                                        key={card.number}
                                        href={`/browse-research?sdg=${encodeURIComponent(card.label)}`}
                                        className="min-h-40 rounded-[14px] px-5 py-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5"
                                        style={{
                                            backgroundColor: card.color,
                                            color: colors.primary,
                                        }}
                                    >
                                        <p
                                            className="text-[32px] leading-8 font-bold"
                                            style={{
                                                color: colors.secondary,
                                            }}
                                        >
                                            {card.number}
                                        </p>
                                        <p className="mt-4 text-sm leading-5 font-semibold">
                                            {card.label}
                                        </p>
                                        <div
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                                            style={{
                                                backgroundColor:
                                                    colors.badgeBackground,
                                            }}
                                        >
                                            <FileText className="size-3" />
                                            <span className="text-xs font-medium">
                                                {card.count} records
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="mt-16 bg-white py-16">
                    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
                        <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                            <div>
                                <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                                    Featured Research
                                </h2>
                                <p className="mt-1 text-base leading-6 text-[#6b7280]">
                                    Recently published research records
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

                        {isSummaryLoading ? (
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 3 }, (_, index) => (
                                    <div
                                        key={index}
                                        className="min-h-[304px] animate-pulse rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb]"
                                    />
                                ))}
                            </div>
                        ) : summary.featuredResearch.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {summary.featuredResearch.map((item) => (
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
                                            href={`/browse-research/${item.public_identifier}`}
                                            className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-[#1e3a8a]"
                                        >
                                            View Research
                                            <ArrowRight className="size-3" />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] px-6 py-10 text-center">
                                <FileText className="mx-auto size-10 text-[#9ca3af]" />
                                <h3 className="mt-3 text-base font-semibold text-[#1e3a8a]">
                                    No featured research yet
                                </h3>
                                <p className="mx-auto mt-1 max-w-[420px] text-sm leading-5 text-[#6b7280]">
                                    Published public records will appear here
                                    once agencies add research to the portal.
                                </p>
                            </div>
                        )}
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

                        {isAgenciesLoading ? (
                            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 3 }, (_, index) => (
                                    <div
                                        key={index}
                                        className="h-[188px] animate-pulse rounded-[14px] border border-[#f3f4f6] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                    />
                                ))}
                            </div>
                        ) : agencies.length > 0 ? (
                            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {agencies.map((agency) => (
                                    <Link
                                        key={agency.slug}
                                        href={`/agencies/${agency.slug}`}
                                        className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5"
                                    >
                                        <LandingAgencyLogo agency={agency} />
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
                        ) : (
                            <div className="mt-10 rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-10 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                <Building2 className="mx-auto size-10 text-[#9ca3af]" />
                                <h3 className="mt-3 text-base font-semibold text-[#1e3a8a]">
                                    No participating agencies yet
                                </h3>
                                <p className="mx-auto mt-1 max-w-[420px] text-sm leading-5 text-[#6b7280]">
                                    Active agency profiles will appear here once
                                    they are available for public browsing.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <PortalFooter />
            </div>
        </>
    );
}
