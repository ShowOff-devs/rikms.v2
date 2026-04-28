import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';

const heroBackgroundImage =
    '/assets/figma/6ef85a09-2403-46c7-bba0-94f5422c5ac1.jpg';
const brandIcon =
    '/assets/figma/719739ba-27cc-4a77-93a4-629585e4c91a.svg';
const footerBrandIcon =
    '/assets/figma/5b94cf81-5c55-4cb6-944a-355c720fe4ae.svg';
const searchIcon =
    '/assets/figma/9e11cc0b-a10b-4fdb-ad44-4800f519e923.svg';
const browseIcon =
    '/assets/figma/a29ab58f-3743-4ef9-9605-90a30a384c42.svg';
const agencyCtaIcon =
    '/assets/figma/c69fa17b-e387-4844-81c7-935032436c9d.svg';
const statIconResearch =
    '/assets/figma/1463761f-2e97-402a-9e8e-fc8701eb9ec6.svg';
const statIconAgencies =
    '/assets/figma/2eb02c7d-3db9-453c-a691-e8a50dd31057.svg';
const statIconCategories =
    '/assets/figma/82b50c5c-1429-466c-aab0-d3409c799684.svg';
const statIconPublications =
    '/assets/figma/3b542538-48dd-4c57-b469-eb20e41f77c7.svg';
const cardMetaIcon =
    '/assets/figma/a94ed080-b082-490e-a228-ec7bd20ebd95.svg';
const featuredOrgIcon =
    '/assets/figma/aa9cf913-982a-4c55-bed8-95e23a5f756d.svg';
const featuredYearIcon =
    '/assets/figma/0245e423-77c5-4654-8524-ef639849abaa.svg';
const arrowIcon =
    '/assets/figma/9f85ed3c-57a1-412d-974e-debab3c65915.svg';
const agenciesIcon =
    '/assets/figma/c7112fca-f6ec-44d1-8446-4a37b84cf29a.svg';
const agenciesMetaIcon =
    '/assets/figma/0ec47d1d-6375-4ff6-bc7b-f3b74c71014f.svg';

type SdgCard = {
    number: string;
    title: string;
    papers: string;
    bgColor: string;
};

type FeaturedResearch = {
    title: string;
    authors: string;
    agency: string;
    year: string;
    description: string;
    tags: { name: string; color: string }[];
};

type Agency = {
    shortName: string;
    fullName: string;
    publications: string;
};

const sdgCards: SdgCard[] = [
    { number: '1', title: 'No Poverty', papers: '54 Research Papers', bgColor: '#e5243b' },
    { number: '2', title: 'Zero Hunger', papers: '38 Research Papers', bgColor: '#dda63a' },
    { number: '3', title: 'Good Health and Well-being', papers: '128 Research Papers', bgColor: '#4c9f38' },
    { number: '4', title: 'Quality Education', papers: '245 Research Papers', bgColor: '#c5192d' },
    { number: '5', title: 'Gender Equality', papers: '67 Research Papers', bgColor: '#ff3a21' },
    { number: '6', title: 'Clean Water and Sanitation', papers: '82 Research Papers', bgColor: '#26bde2' },
    { number: '7', title: 'Affordable and Clean Energy', papers: '41 Research Papers', bgColor: '#fcc30b' },
    { number: '8', title: 'Decent Work and Economic Growth', papers: '93 Research Papers', bgColor: '#a21942' },
    { number: '9', title: 'Industry, Innovation and Infrastructure', papers: '115 Research Papers', bgColor: '#fd6925' },
    { number: '10', title: 'Reduced Inequalities', papers: '29 Research Papers', bgColor: '#dd1367' },
    { number: '11', title: 'Sustainable Cities and Communities', papers: '76 Research Papers', bgColor: '#fd9d24' },
    { number: '12', title: 'Responsible Consumption and Production', papers: '48 Research Papers', bgColor: '#bf8b2e' },
    { number: '13', title: 'Climate Action', papers: '97 Research Papers', bgColor: '#3f7e44' },
    { number: '14', title: 'Life Below Water', papers: '63 Research Papers', bgColor: '#0a97d9' },
    { number: '15', title: 'Life on Land', papers: '55 Research Papers', bgColor: '#56c02b' },
    { number: '16', title: 'Peace, Justice and Strong Institutions', papers: '34 Research Papers', bgColor: '#00689d' },
    { number: '17', title: 'Partnerships for the Goals', papers: '72 Research Papers', bgColor: '#19486a' },
];

const featuredResearch: FeaturedResearch[] = [
    {
        title: 'Impact of Climate Change on Coastal Communities in the Davao Gulf',
        authors: 'Dr. Maria Santos, Dr. Juan Dela Cruz, Prof. Ana Reyes',
        agency: 'SMAARRDEC',
        year: '2025',
        description:
            'This study examines the socioeconomic impact of climate change on coastal communities along the Davao Gulf. Through comprehensive field surveys and data analysis spanning five years, the research identifies key vulnerability factors and proposes evidence-based adaptation strategies for local government units in Region XI.',
        tags: [
            { name: 'SDG 13', color: '#3f7e44' },
            { name: 'SDG 14', color: '#0a97d9' },
            { name: 'SDG 11', color: '#fd9d24' },
        ],
    },
    {
        title: 'Digital Literacy Programs and Their Effect on Rural Education Outcomes in Davao Region',
        authors: 'Prof. Roberto Garcia, Dr. Elena Marquez',
        agency: 'CHED XI',
        year: '2025',
        description:
            'An analysis of digital literacy programs implemented across rural schools in Davao Region. The study measures improvements in student performance, teacher effectiveness, and overall educational outcomes following the introduction of technology-based learning interventions in underserved areas of Region XI.',
        tags: [
            { name: 'SDG 4', color: '#c5192d' },
            { name: 'SDG 10', color: '#dd1367' },
            { name: 'SDG 9', color: '#fd6925' },
        ],
    },
    {
        title: 'Sustainable Agriculture Practices for Smallholder Farmers in Southern Mindanao',
        authors: 'Dr. Pedro Villanueva, Dr. Rosa Lim, Dr. Carlos Tan',
        agency: 'SMAARRDEC',
        year: '2024',
        description:
            'This research investigates the adoption and impact of sustainable agriculture practices among smallholder farmers in Southern Mindanao. The study documents best practices in organic farming, water conservation, and crop diversification that have led to improved yields and income for participating farming communities.',
        tags: [
            { name: 'SDG 2', color: '#dda63a' },
            { name: 'SDG 12', color: '#bf8b2e' },
            { name: 'SDG 15', color: '#56c02b' },
            { name: 'SDG 1', color: '#e5243b' },
        ],
    },
    {
        title: 'Public Health Response Framework for Emerging Infectious Diseases in Region XI',
        authors: 'Dr. Isabella Cruz, Dr. Fernando Aquino',
        agency: 'RHRDC XI',
        year: '2025',
        description:
            'A comprehensive framework for public health response to emerging infectious diseases in Davao Region based on lessons learned from recent pandemics. The study proposes a multi-tiered response system incorporating surveillance, rapid testing, contact tracing, and community-based health interventions tailored for Region XI.',
        tags: [
            { name: 'SDG 3', color: '#4c9f38' },
            { name: 'SDG 17', color: '#19486a' },
        ],
    },
    {
        title: 'Renewable Energy Adoption in Island Communities of Davao Region',
        authors: 'Eng. Miguel Ramos, Dr. Patricia Navarro, Prof. Luis Bautista',
        agency: 'DRIEERDC',
        year: '2024',
        description:
            'This study explores the feasibility and challenges of renewable energy adoption in island communities of the Davao Region. Through case studies across Island Garden City of Samal and other island barangays, the research examines solar, wind, and micro-hydro implementations, identifying key factors for successful deployment.',
        tags: [
            { name: 'SDG 7', color: '#fcc30b' },
            { name: 'SDG 13', color: '#3f7e44' },
            { name: 'SDG 11', color: '#fd9d24' },
            { name: 'SDG 9', color: '#fd6925' },
        ],
    },
    {
        title: 'Gender Equality in STEM Education: A Regional Assessment of Davao Higher Education Institutions',
        authors: 'Dr. Carmen Flores, Prof. Diana Salazar',
        agency: 'USEP',
        year: '2024',
        description:
            'A regional assessment of gender equality in STEM education across higher education institutions in the Davao Region. The research examines enrollment patterns, retention rates, and career outcomes disaggregated by gender, identifying institutional barriers and successful intervention programs at USEP and partner institutions.',
        tags: [
            { name: 'SDG 5', color: '#ff3a21' },
            { name: 'SDG 4', color: '#c5192d' },
            { name: 'SDG 10', color: '#dd1367' },
        ],
    },
];

const agencies: Agency[] = [
    {
        shortName: 'DOST XI',
        fullName: 'Department of Science and Technology – Region XI',
        publications: '142 publications',
    },
    {
        shortName: 'CHED XI',
        fullName: 'Commission on Higher Education – Region XI',
        publications: '98 publications',
    },
    {
        shortName: 'NEDA XI',
        fullName: 'National Economic and Development Authority – Region XI',
        publications: '87 publications',
    },
    {
        shortName: 'DTI XI',
        fullName: 'Department of Trade and Industry – Region XI',
        publications: '64 publications',
    },
    {
        shortName: 'DICT XI',
        fullName: 'Department of Information and Communications Technology – Region XI',
        publications: '53 publications',
    },
    {
        shortName: 'RHRDC XI',
        fullName: 'Regional Health Research and Development Consortium XI',
        publications: '76 publications',
    },
    {
        shortName: 'DRIEERDC',
        fullName: 'Davao Region Industry Energy and Emerging Technology Research and Development Consortium',
        publications: '61 publications',
    },
    {
        shortName: 'SMAARRDEC',
        fullName: 'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        publications: '89 publications',
    },
    {
        shortName: 'USEP',
        fullName: 'University of Southeastern Philippines',
        publications: '121 publications',
    },
];

export default function Welcome() {
    const { auth } = usePage().props as { auth: { user: unknown | null } };

    return (
        <>
            <Head title="RIKMS">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a] [font-family:Inter,sans-serif]">
                <header className="border-b border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                    <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-6">
                        <a href="#" className="flex shrink-0 items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1e3a8a]">
                                <img
                                    src={brandIcon}
                                    alt="RIKMS"
                                    className="h-5 w-5"
                                />
                            </span>
                            <span className="text-[17.6px] leading-[26.4px] font-bold tracking-[-0.44px] text-[#1e3a8a]">
                                RIKMS
                            </span>
                        </a>

                        <div className="ml-[116px] hidden w-[448px] items-center rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 md:flex">
                            <img src={searchIcon} alt="" className="h-4 w-4" />
                            <span className="ml-3 text-sm text-[#0a0a0a80]">
                                Search research, keywords, agencies, or SDGs
                            </span>
                        </div>

                        <nav className="ml-auto flex items-center gap-1">
                            <Link
                                href="/browse-research"
                                className="rounded-lg px-3 py-2 text-sm text-[#6b7280]"
                            >
                                Browse Research
                            </Link>
                            <Link
                                href="/agencies"
                                className="rounded-lg px-3 py-2 text-sm text-[#6b7280]"
                            >
                                Agencies
                            </Link>
                            <Link
                                href="/about"
                                className="rounded-lg px-3 py-2 text-sm text-[#6b7280]"
                            >
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

                <section className="relative h-[464px] overflow-hidden bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#2d4ba0]">
                    <img
                        src={heroBackgroundImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[rgba(30,58,138,0.9)] to-[rgba(30,58,138,0.7)]" />
                    <div className="relative mx-auto max-w-[1200px] px-6 pt-28">
                        <h1 className="max-w-[604px] text-4xl leading-[43.2px] font-bold text-white">
                            Regionwide Integrated Knowledge Management System
                        </h1>
                        <p className="mt-4 max-w-[610px] text-[18px] leading-[29.25px] text-[#dbeafe]">
                            A regional platform for discovering research studies across
                            government agencies and research institutions in the Davao Region.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/browse-research"
                                className="inline-flex h-[47.6px] items-center rounded-[10px] bg-white px-6 text-[14.4px] leading-[21.6px] font-semibold text-[#1e3a8a]"
                            >
                                <img src={browseIcon} alt="" className="h-4 w-4" />
                                <span className="ml-2">Browse Research</span>
                            </Link>
                            <Link
                                href="/agencies"
                                className="inline-flex h-[47.6px] items-center rounded-[10px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.15)] px-6 text-[14.4px] leading-[21.6px] font-semibold text-white"
                            >
                                <img
                                    src={agencyCtaIcon}
                                    alt=""
                                    className="h-4 w-4"
                                />
                                <span className="ml-2">View Participating Agencies</span>
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="relative z-10 -mt-8 mx-auto w-full max-w-[1200px] px-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                value: '730',
                                label: 'Total Research Studies',
                                icon: statIconResearch,
                            },
                            {
                                value: '9',
                                label: 'Participating Agencies',
                                icon: statIconAgencies,
                            },
                            {
                                value: '17',
                                label: 'Research Categories',
                                icon: statIconCategories,
                            },
                            {
                                value: '156',
                                label: 'Latest Publications',
                                icon: statIconPublications,
                            },
                        ].map((stat) => (
                            <article
                                key={stat.label}
                                className="h-44 rounded-[14px] border border-[#f3f4f6] bg-white px-6 pt-6 pb-[25px] text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                            >
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)]">
                                    <img src={stat.icon} alt="" className="h-6 w-6" />
                                </div>
                                <p className="mt-3 text-[42px] leading-[42px] font-bold text-[#1e3a8a]">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                                    {stat.label}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mx-auto mt-16 w-full max-w-[1200px] px-6">
                    <div className="text-center">
                        <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                            Research Contributions to the Sustainable Development Goals
                        </h2>
                        <p className="mx-auto mt-2 max-w-[766px] text-base leading-6 text-[#6b7280]">
                            Research studies in RIKMS are categorized according to the United Nations
                            Sustainable Development Goals to highlight how regional research contributes
                            to global development priorities.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {sdgCards.map((card) => (
                            <article
                                key={card.number}
                                className="h-40 rounded-[14px] px-5 pt-5 pb-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                style={{ backgroundColor: card.bgColor }}
                            >
                                <p className="text-[32px] leading-8 font-bold text-[rgba(255,255,255,0.6)]">
                                    {card.number}
                                </p>
                                <p className="mt-4 text-[13.6px] leading-[18.7px] font-semibold text-white">
                                    {card.title}
                                </p>
                                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.2)] px-3 py-1">
                                    <img src={cardMetaIcon} alt="" className="h-3 w-3" />
                                    <span className="text-xs leading-4 font-medium text-[rgba(255,255,255,0.9)]">
                                        {card.papers}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="featured-research" className="mt-16 bg-white py-16">
                    <div className="mx-auto w-full max-w-[1200px] px-6">
                        <div className="mb-10 flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                                    Featured Research
                                </h2>
                                <p className="mt-1 text-base leading-6 text-[#6b7280]">
                                    Latest and most impactful research publications
                                </p>
                            </div>
                            <a
                                href="#"
                                className="inline-flex items-center gap-1 text-sm leading-5 font-medium text-[#1e3a8a]"
                            >
                                <span>View all research</span>
                                <img src={arrowIcon} alt="" className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {featuredResearch.map((item) => (
                                <article
                                    key={item.title}
                                    className="flex h-[304px] flex-col rounded-[14px] border border-[#f3f4f6] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {item.tags.map((tag) => (
                                            <span
                                                key={`${item.title}-${tag.name}`}
                                                className="rounded-full px-2 py-0.5 text-xs leading-4 font-medium text-white"
                                                style={{ backgroundColor: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="line-clamp-3 min-h-[44px] text-base leading-[22px] font-semibold text-[#1e3a8a]">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-2 min-h-4 text-xs leading-4 text-[#6b7280]">
                                        {item.authors}
                                    </p>
                                    <div className="mt-1 flex items-center gap-3 text-xs leading-4 text-[#6b7280]">
                                        <span className="inline-flex items-center gap-1">
                                            <img
                                                src={featuredOrgIcon}
                                                alt=""
                                                className="h-3 w-3"
                                            />
                                            {item.agency}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <img
                                                src={featuredYearIcon}
                                                alt=""
                                                className="h-3 w-3"
                                            />
                                            {item.year}
                                        </span>
                                    </div>
                                    <p className="mt-3 h-[60px] overflow-hidden text-sm leading-5 text-[#6b7280]">
                                        {item.description}
                                    </p>
                                    <a
                                        href="#"
                                        className="mt-auto inline-flex items-center gap-1 text-sm leading-5 font-medium text-[#1e3a8a]"
                                    >
                                        <span>View Research</span>
                                        <img src={arrowIcon} alt="" className="h-3 w-3" />
                                    </a>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="agencies" className="pt-16 pb-16">
                    <div className="mx-auto w-full max-w-[1200px] px-6">
                        <div className="text-center">
                            <h2 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                                Participating Agencies in Davao Region
                            </h2>
                            <p className="mt-2 text-base leading-6 text-[#6b7280]">
                                Government agencies and research consortia contributing to the regional
                                knowledge base
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {agencies.map((agency) => (
                                <article
                                    key={agency.shortName}
                                    className="h-[196px] rounded-[14px] border border-[#f3f4f6] bg-white px-6 pt-6 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)]">
                                        <img src={agenciesIcon} alt="" className="h-7 w-7" />
                                    </div>
                                    <h3 className="mt-3 text-[20.4px] leading-[20.4px] font-semibold text-[#1e3a8a]">
                                        {agency.shortName}
                                    </h3>
                                    <p className="mt-2 h-8 text-xs leading-4 text-[#6b7280]">
                                        {agency.fullName}
                                    </p>
                                    <p className="mt-2 inline-flex items-center gap-1 text-xs leading-4 text-[#6b7280]">
                                        <img
                                            src={agenciesMetaIcon}
                                            alt=""
                                            className="h-3 w-3"
                                        />
                                        {agency.publications}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <footer className="bg-[#1e3a8a] px-6 pt-12 pb-12">
                    <div className="mx-auto w-full max-w-[1200px]">
                        <div className="grid gap-8 md:grid-cols-3">
                            <div>
                                <Link href="/" className="inline-flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.2)]">
                                        <img
                                            src={footerBrandIcon}
                                            alt="RIKMS"
                                            className="h-5 w-5"
                                        />
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
                                <h4 className="text-base leading-6 font-semibold text-white">
                                    Research
                                </h4>
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
                                <h4 className="text-base leading-6 font-semibold text-white">
                                    Legal
                                </h4>
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
