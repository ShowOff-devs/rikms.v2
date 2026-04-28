import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, home, login } from '@/routes';

const brandIcon = '/assets/figma/fb185ee7-1eeb-4627-9663-62c5d590f070.svg';
const footerBrandIcon = '/assets/figma/5b94cf81-5c55-4cb6-944a-355c720fe4ae.svg';
const searchIcon = '/assets/figma/9e11cc0b-a10b-4fdb-ad44-4800f519e923.svg';
const agencyMetaIcon = '/assets/figma/a94ed080-b082-490e-a228-ec7bd20ebd95.svg';
const yearMetaIcon = '/assets/figma/0245e423-77c5-4654-8524-ef639849abaa.svg';
const arrowIcon = '/assets/figma/9f85ed3c-57a1-412d-974e-debab3c65915.svg';

type SdgFilter = {
    label: string;
    color: string;
};

type ResearchTag = {
    label: string;
    color: string;
    muted?: boolean;
};

type ResearchItem = {
    title: string;
    authors: string;
    agency: string;
    year: string;
    downloads: string;
    description: string;
    tags: ResearchTag[];
};

const sdgFilters: SdgFilter[] = [
    { label: 'SDG 1', color: '#e5243b' },
    { label: 'SDG 2', color: '#dda63a' },
    { label: 'SDG 3', color: '#4c9f38' },
    { label: 'SDG 4', color: '#c5192d' },
    { label: 'SDG 5', color: '#ff3a21' },
    { label: 'SDG 6', color: '#26bde2' },
    { label: 'SDG 7', color: '#fcc30b' },
    { label: 'SDG 8', color: '#a21942' },
    { label: 'SDG 9', color: '#fd6925' },
    { label: 'SDG 10', color: '#dd1367' },
    { label: 'SDG 11', color: '#fd9d24' },
    { label: 'SDG 12', color: '#bf8b2e' },
    { label: 'SDG 13', color: '#3f7e44' },
    { label: 'SDG 14', color: '#0a97d9' },
    { label: 'SDG 15', color: '#56c02b' },
    { label: 'SDG 16', color: '#00689d' },
    { label: 'SDG 17', color: '#19486a' },
];

const researchItems: ResearchItem[] = [
    {
        title: 'Impact of Climate Change on Coastal Communities in the Davao Gulf',
        authors: 'Dr. Maria Santos, Dr. Juan Dela Cruz, Prof. Ana Reyes',
        agency: 'SMAARRDEC',
        year: '2025',
        downloads: '1,247 downloads',
        description:
            'This study examines the socioeconomic impact of climate change on coastal communities along the Davao Gulf. Through comprehensive field surveys and data analysis spanning five years, the research identifies key vulnerability factors and proposes evidence-based adaptation strategies for local government units in Region XI.',
        tags: [
            { label: 'SDG 13', color: '#3f7e44' },
            { label: 'SDG 14', color: '#0a97d9' },
            { label: 'SDG 11', color: '#fd9d24' },
            { label: 'Environmental Science', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Digital Literacy Programs and Their Effect on Rural Education Outcomes in Davao Region',
        authors: 'Prof. Roberto Garcia, Dr. Elena Marquez',
        agency: 'CHED XI',
        year: '2025',
        downloads: '893 downloads',
        description:
            'An analysis of digital literacy programs implemented across rural schools in Davao Region. The study measures improvements in student performance, teacher effectiveness, and overall educational outcomes following the introduction of technology-based learning interventions in underserved areas of Region XI.',
        tags: [
            { label: 'SDG 4', color: '#c5192d' },
            { label: 'SDG 10', color: '#dd1367' },
            { label: 'SDG 9', color: '#fd6925' },
            { label: 'Education', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Public Health Response Framework for Emerging Infectious Diseases in Region XI',
        authors: 'Dr. Isabella Cruz, Dr. Fernando Aquino',
        agency: 'RHRDC XI',
        year: '2025',
        downloads: '2,103 downloads',
        description:
            'A comprehensive framework for public health response to emerging infectious diseases in Davao Region based on lessons learned from recent pandemics. The study proposes a multi-tiered response system incorporating surveillance, rapid testing, contact tracing, and community-based health interventions tailored for Region XI.',
        tags: [
            { label: 'SDG 3', color: '#4c9f38' },
            { label: 'SDG 17', color: '#19486a' },
            { label: 'Public Health', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Economic Impact of Digital Transformation on MSMEs in Davao Region',
        authors: 'Dr. Antonio Mendoza, Dr. Grace Lim, Prof. Ricardo Santos',
        agency: 'DTI XI',
        year: '2025',
        downloads: '567 downloads',
        description:
            'An economic impact assessment of digital transformation initiatives on micro, small, and medium enterprises in the Davao Region. The study analyzes the adoption of e-commerce platforms, digital payment systems, and online marketing strategies among MSMEs and their effects on revenue growth and market expansion.',
        tags: [
            { label: 'SDG 8', color: '#a21942' },
            { label: 'SDG 17', color: '#19486a' },
            { label: 'SDG 10', color: '#dd1367' },
            { label: 'Economics', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'IoT-Based Environmental Monitoring System for Mount Apo Natural Park',
        authors: 'Eng. Sofia Reyes, Dr. Marco Villanueva',
        agency: 'DOST XI',
        year: '2025',
        downloads: '389 downloads',
        description:
            "This study presents an IoT-based environmental monitoring system deployed across Mount Apo Natural Park. The research demonstrates real-time monitoring capabilities for biodiversity indicators, air quality, and water quality parameters, evaluating the system's effectiveness in conservation management and early hazard detection.",
        tags: [
            { label: 'SDG 6', color: '#26bde2' },
            { label: 'SDG 9', color: '#fd6925' },
            { label: 'SDG 15', color: '#56c02b' },
            { label: 'Technology', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Cybersecurity Readiness Assessment of Government ICT Infrastructure in Region XI',
        authors: 'Eng. Rafael Domingo, Dr. Lisa Tan',
        agency: 'DICT XI',
        year: '2025',
        downloads: '312 downloads',
        description:
            'A comprehensive cybersecurity readiness assessment of government ICT infrastructure across Region XI agencies. The study evaluates current security protocols, identifies vulnerabilities, and proposes a regional cybersecurity framework aligned with national digital governance standards.',
        tags: [
            { label: 'SDG 9', color: '#fd6925' },
            { label: 'SDG 16', color: '#00689d' },
            { label: 'SDG 17', color: '#19486a' },
            { label: 'Technology', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Sustainable Agriculture Practices for Smallholder Farmers in Southern Mindanao',
        authors: 'Dr. Pedro Villanueva, Dr. Rosa Lim, Dr. Carlos Tan',
        agency: 'SMAARRDEC',
        year: '2024',
        downloads: '756 downloads',
        description:
            'This research investigates the adoption and impact of sustainable agriculture practices among smallholder farmers in Southern Mindanao. The study documents best practices in organic farming, water conservation, and crop diversification that have led to improved yields and income for participating farming communities.',
        tags: [
            { label: 'SDG 2', color: '#dda63a' },
            { label: 'SDG 12', color: '#bf8b2e' },
            { label: 'SDG 15', color: '#56c02b' },
            { label: 'SDG 1', color: '#e5243b' },
            { label: 'Agriculture', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Renewable Energy Adoption in Island Communities of Davao Region',
        authors: 'Eng. Miguel Ramos, Dr. Patricia Navarro, Prof. Luis Bautista',
        agency: 'DRIEERDC',
        year: '2024',
        downloads: '634 downloads',
        description:
            'This study explores the feasibility and challenges of renewable energy adoption in island communities of the Davao Region. Through case studies across Island Garden City of Samal and other island barangays, the research examines solar, wind, and micro-hydro implementations, identifying key factors for successful deployment.',
        tags: [
            { label: 'SDG 7', color: '#fcc30b' },
            { label: 'SDG 13', color: '#3f7e44' },
            { label: 'SDG 11', color: '#fd9d24' },
            { label: 'SDG 9', color: '#fd6925' },
            { label: 'Technology', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Gender Equality in STEM Education: A Regional Assessment of Davao Higher Education Institutions',
        authors: 'Dr. Carmen Flores, Prof. Diana Salazar',
        agency: 'USEP',
        year: '2024',
        downloads: '445 downloads',
        description:
            'A regional assessment of gender equality in STEM education across higher education institutions in the Davao Region. The research examines enrollment patterns, retention rates, and career outcomes disaggregated by gender, identifying institutional barriers and successful intervention programs at USEP and partner institutions.',
        tags: [
            { label: 'SDG 5', color: '#ff3a21' },
            { label: 'SDG 4', color: '#c5192d' },
            { label: 'SDG 10', color: '#dd1367' },
            { label: 'Social Sciences', color: '#f3f4f6', muted: true },
        ],
    },
    {
        title: 'Regional Development Planning Using Geospatial Analysis in Davao Region',
        authors: 'Dr. Teresa Mendez, Prof. Andrew Pascual, Dr. Lea Navarro',
        agency: 'NEDA XI',
        year: '2024',
        downloads: '478 downloads',
        description:
            'This research applies geospatial analysis techniques to regional development planning in the Davao Region. The study integrates satellite imagery, census data, and economic indicators to create comprehensive spatial models that support evidence-based policy decisions for sustainable regional growth.',
        tags: [
            { label: 'SDG 11', color: '#fd9d24' },
            { label: 'SDG 8', color: '#a21942' },
            { label: 'SDG 17', color: '#19486a' },
            { label: 'Social Sciences', color: '#f3f4f6', muted: true },
        ],
    },
];

const years = ['2025', '2024', '2023', '2022', '2021'];

function Chevron({ up = false }: { up?: boolean }) {
    return (
        <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={`h-4 w-4 text-[#6b7280] ${up ? 'rotate-180' : ''}`}
        >
            <path
                d="M4.47 6.47a.75.75 0 0 1 1.06 0L8 8.94l2.47-2.47a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
            />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 text-[#1e3a8a]">
            <path
                d="M8 1.5a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V2.25A.75.75 0 0 1 8 1.5Zm-5 11a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Z"
                fill="currentColor"
            />
        </svg>
    );
}

function DownloadsMetaIcon() {
    return (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 text-[#6b7280]">
            <path
                d="M8 2a.75.75 0 0 1 .75.75v5.94l1.47-1.47a.75.75 0 1 1 1.06 1.06l-2.75 2.75a.75.75 0 0 1-1.06 0L4.72 8.28a.75.75 0 0 1 1.06-1.06l1.47 1.47V2.75A.75.75 0 0 1 8 2Zm-4.25 9.5a.75.75 0 0 1 .75.75v.25h7v-.25a.75.75 0 0 1 1.5 0v.25A1.75 1.75 0 0 1 11.25 14h-7A1.75 1.75 0 0 1 2.5 12.5v-.25a.75.75 0 0 1 .75-.75Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default function BrowseResearchPage() {
    const { auth } = usePage().props as { auth: { user: unknown | null } };

    return (
        <>
            <Head title="Browse Research">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a] [font-family:Inter,sans-serif]">
                <header className="border-b border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                    <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-y-2 px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
                        <Link href={home()} className="flex shrink-0 items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1e3a8a]">
                                <img src={brandIcon} alt="RIKMS" className="h-5 w-5" />
                            </span>
                            <span className="text-[17.6px] leading-[26.4px] font-bold tracking-[-0.44px] text-[#1e3a8a]">
                                RIKMS
                            </span>
                        </Link>

                        <div className="ml-[116px] hidden w-[448px] items-center rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 lg:flex">
                            <img src={searchIcon} alt="" className="h-4 w-4" />
                            <span className="ml-3 text-sm text-[#0a0a0a80]">
                                Search research, keywords, agencies, or SDGs
                            </span>
                        </div>

                        <nav className="flex w-full items-center justify-end gap-1 lg:ml-auto lg:w-auto">
                            <span className="rounded-lg bg-[#eff6ff] px-3 py-2 text-sm text-[#1e3a8a]">
                                Browse Research
                            </span>
                            <Link href="/agencies" className="rounded-lg px-3 py-2 text-sm text-[#6b7280]">
                                Agencies
                            </Link>
                            <Link href="/about" className="rounded-lg px-3 py-2 text-sm text-[#6b7280]">
                                About
                            </Link>
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="rounded-[10px] bg-[#1e3a8a] px-4 py-2 text-sm text-white"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={login()}
                                    className="rounded-[10px] bg-[#1e3a8a] px-4 py-2 text-sm text-white"
                                >
                                    Login
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
                    <div>
                        <h1 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">Browse Research</h1>
                        <p className="mt-1 text-base leading-6 text-[#6b7280]">
                            Discover and explore research publications from participating agencies
                        </p>
                    </div>

                    <div className="mt-6 flex flex-col items-start gap-6 lg:flex-row lg:gap-8">
                        <aside className="w-full shrink-0 rounded-[14px] border border-[#f3f4f6] bg-white px-[21px] pt-[21px] pb-px shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] lg:w-64">
                            <h2 className="text-[15.2px] leading-[22.8px] font-semibold text-[#1e3a8a]">
                                Filters
                            </h2>

                            <section className="mt-4 border-b border-[#f3f4f6] pb-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm leading-5 font-semibold text-[#1e3a8a]">SDG</h3>
                                    <Chevron up />
                                </div>
                                <div className="mt-2 space-y-1.5 pb-2">
                                    {sdgFilters.map((sdg) => (
                                        <label key={sdg.label} className="flex h-5 items-center gap-2">
                                            <span className="h-[13px] w-[13px] rounded-[3px] border border-[#d1d5db]" />
                                            <span
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: sdg.color }}
                                            />
                                            <span className="text-sm leading-5 text-[#6b7280]">{sdg.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-4 border-b border-[#f3f4f6] pb-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm leading-5 font-semibold text-[#1e3a8a]">Agency</h3>
                                    <Chevron />
                                </div>
                            </section>

                            <section className="mt-4 border-b border-[#f3f4f6] pb-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm leading-5 font-semibold text-[#1e3a8a]">
                                        Publication Year
                                    </h3>
                                    <Chevron up />
                                </div>
                                <div className="mt-2 space-y-1.5">
                                    {years.map((year) => (
                                        <label key={year} className="flex h-5 items-center gap-2">
                                            <span className="h-[13px] w-[13px] rounded-[3px] border border-[#d1d5db]" />
                                            <span className="text-sm leading-5 text-[#6b7280]">{year}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-4 border-t border-[#f3f4f6] pt-3">
                                    <p className="text-xs leading-4 font-semibold text-[#1e3a8a]">
                                        Custom Range
                                    </p>
                                    <div className="mt-2 flex items-end gap-2">
                                        <div className="w-[96px]">
                                            <p className="text-xs leading-4 text-[#6b7280]">From</p>
                                            <div className="mt-1 h-[34px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-2 text-sm leading-[34px] text-[#0a0a0a]">
                                                2010
                                            </div>
                                        </div>
                                        <span className="pb-2 text-xs leading-4 text-[#6b7280]">-</span>
                                        <div className="w-[96px]">
                                            <p className="text-xs leading-4 text-[#6b7280]">To</p>
                                            <div className="mt-1 h-[34px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-2 text-sm leading-[34px] text-[#0a0a0a]">
                                                2025
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 px-0.5">
                                        <div className="flex items-center justify-between text-xs leading-4 text-[#99a1af]">
                                            <span>2010</span>
                                            <span>2025</span>
                                        </div>
                                        <div className="mt-1 h-1 rounded-full bg-[#1e3a8a]" />
                                    </div>
                                    <button
                                        type="button"
                                        className="mt-3 h-7 w-full rounded-[10px] bg-[rgba(30,58,138,0.1)] text-xs leading-4 font-medium text-[#1e3a8a]"
                                    >
                                        Apply Year Range
                                    </button>
                                </div>
                            </section>

                            <section className="mt-4 pb-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm leading-5 font-semibold text-[#1e3a8a]">
                                        Research Category
                                    </h3>
                                    <Chevron />
                                </div>
                            </section>
                        </aside>

                        <section className="min-w-0 w-full flex-1">
                            <div className="rounded-[14px] border border-[#f3f4f6] bg-white px-[17px] pt-[17px] pb-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative flex-1">
                                        <img
                                            src={searchIcon}
                                            alt=""
                                            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                                        />
                                        <input
                                            readOnly
                                            type="text"
                                            placeholder="Search within results..."
                                            className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[rgba(10,10,10,0.5)] outline-none"
                                        />
                                    </div>
                                    <div className="h-[38px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] sm:w-[167px]" />
                                </div>
                                <p className="mt-2 text-xs leading-4 text-[#6b7280]">Showing 10 results</p>
                            </div>

                            <div className="mt-4 space-y-4">
                                {researchItems.map((item) => (
                                    <article
                                        key={item.title}
                                        className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 pt-6 pb-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {item.tags.map((tag) => (
                                                <span
                                                    key={`${item.title}-${tag.label}`}
                                                    className={`rounded-full px-2 py-0.5 text-xs leading-4 ${
                                                        tag.muted ? 'font-normal text-[#6b7280]' : 'font-medium text-white'
                                                    }`}
                                                    style={{ backgroundColor: tag.color }}
                                                >
                                                    {tag.label}
                                                </span>
                                            ))}
                                        </div>
                                        <h2 className="mt-2 text-[16.8px] leading-[25.2px] font-semibold text-[#1e3a8a]">
                                            {item.title}
                                        </h2>
                                        <p className="text-xs leading-4 text-[#6b7280]">{item.authors}</p>
                                        <div className="mt-1 flex items-center gap-3 text-xs leading-4 text-[#6b7280]">
                                            <span className="inline-flex items-center gap-1">
                                                <img src={agencyMetaIcon} alt="" className="h-3 w-3" />
                                                {item.agency}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <img src={yearMetaIcon} alt="" className="h-3 w-3" />
                                                {item.year}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <DownloadsMetaIcon />
                                                {item.downloads}
                                            </span>
                                        </div>
                                        <p className="mt-3 h-10 overflow-hidden text-sm leading-5 text-[#6b7280]">
                                            {item.description}
                                        </p>
                                        <div className="mt-4 flex flex-wrap items-center gap-3">
                                            <button
                                                type="button"
                                                className="inline-flex h-[38px] items-center gap-1 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white"
                                            >
                                                <span>View Details</span>
                                                <img src={arrowIcon} alt="" className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex h-[38px] items-center gap-1 rounded-[10px] border border-[#1e3a8a] px-4 text-sm leading-5 font-medium text-[#1e3a8a]"
                                            >
                                                <DownloadIcon />
                                                <span>Download PDF</span>
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>

                <footer className="bg-[#1e3a8a] px-6 pt-12 pb-12">
                    <div className="mx-auto w-full max-w-[1200px]">
                        <div className="grid gap-8 md:grid-cols-3">
                            <div>
                                <Link href={home()} className="inline-flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.2)]">
                                        <img src={footerBrandIcon} alt="RIKMS" className="h-5 w-5" />
                                    </span>
                                    <span className="text-[17.6px] leading-[26.4px] font-bold tracking-[-0.44px] text-white">
                                        RIKMS
                                    </span>
                                </Link>
                                <ul className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                                    <li>
                                        <Link href="/about">About</Link>
                                    </li>
                                    <li>
                                        <a href="#">Help</a>
                                    </li>
                                    <li>
                                        <a href="#">Contact</a>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-base leading-6 font-semibold text-white">Research</h4>
                                <ul className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                                    <li>
                                        <Link href="/browse-research">Browse Research</Link>
                                    </li>
                                    <li>
                                        <Link href="/agencies">Agencies</Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-base leading-6 font-semibold text-white">Legal</h4>
                                <ul className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                                    <li>
                                        <a href="#">Privacy Policy</a>
                                    </li>
                                    <li>
                                        <a href="#">Terms of Use</a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-10 border-t border-[rgba(255,255,255,0.2)] pt-6 text-center text-sm leading-5 text-[#bedbff]">
                            © 2026 Regionwide Integrated Knowledge Management System (RIKMS)
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
