import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, home, login } from '@/routes';

const brandIcon = '/assets/figma/fb185ee7-1eeb-4627-9663-62c5d590f070.svg';
const searchIcon = '/assets/figma/7b6e85c9-dc7d-4383-bc24-5c124267c2db.svg';
const agencyIcon = '/assets/figma/018df417-8a30-48c5-9186-b5a0429390e7.svg';
const consortiumIcon = '/assets/figma/21b98cbd-a4d2-47cc-a264-619791a779c9.svg';
const heiIcon = '/assets/figma/9978e357-1948-4075-aa31-fa48abd4231b.svg';
const publicationsIcon = '/assets/figma/6cc3dd35-932d-4027-9f71-4427cf7b2223.svg';
const arrowIcon = '/assets/figma/9d16554a-39aa-41d8-94d3-503c16d3625c.svg';

type AgencyKind = 'Government Agency' | 'Research Consortium' | 'Higher Education Institution';

type Agency = {
    name: string;
    fullName: string;
    description: string;
    publications: string;
    type: AgencyKind;
};

const agencies: Agency[] = [
    {
        name: 'DOST XI',
        fullName: 'Department of Science and Technology - Region XI',
        description:
            'Leads regional research and innovation initiatives across science, technology, and development sectors in the Davao Region.',
        publications: '142 Research Publications',
        type: 'Government Agency',
    },
    {
        name: 'CHED XI',
        fullName: 'Commission on Higher Education - Region XI',
        description:
            'Oversees higher education policies and promotes academic research across universities and colleges in Region XI.',
        publications: '98 Research Publications',
        type: 'Government Agency',
    },
    {
        name: 'NEDA XI',
        fullName: 'National Economic and Development Authority - Region XI',
        description:
            'Provides policy direction and coordination for regional socioeconomic development planning and research.',
        publications: '87 Research Publications',
        type: 'Government Agency',
    },
    {
        name: 'DTI XI',
        fullName: 'Department of Trade and Industry - Region XI',
        description:
            'Promotes trade, industry development, and MSME growth through evidence-based policy research in the Davao Region.',
        publications: '64 Research Publications',
        type: 'Government Agency',
    },
    {
        name: 'DICT XI',
        fullName: 'Department of Information and Communications Technology - Region XI',
        description:
            'Drives digital transformation and ICT development initiatives through research and innovation programs in Region XI.',
        publications: '53 Research Publications',
        type: 'Government Agency',
    },
    {
        name: 'RHRDC XI',
        fullName: 'Regional Health Research and Development Consortium XI',
        description:
            'Coordinates health research and development activities across medical institutions and public health agencies in the Davao Region.',
        publications: '76 Research Publications',
        type: 'Research Consortium',
    },
    {
        name: 'DRIEERDC',
        fullName:
            'Davao Region Industry Energy and Emerging Technology Research and Development Consortium',
        description:
            "Fosters research collaboration in industry, energy, and emerging technologies across the Davao Region's academic and government sectors.",
        publications: '61 Research Publications',
        type: 'Research Consortium',
    },
    {
        name: 'SMAARRDEC',
        fullName:
            'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        description:
            'Promotes agriculture, aquatic, and natural resources research to support sustainable development in Southern Mindanao.',
        publications: '89 Research Publications',
        type: 'Research Consortium',
    },
    {
        name: 'USEP',
        fullName: 'University of Southeastern Philippines',
        description:
            'A premier state university in Davao City advancing academic research across engineering, education, sciences, and technology.',
        publications: '121 Research Publications',
        type: 'Higher Education Institution',
    },
];

const categoryMeta: Record<
    AgencyKind,
    {
        icon: string;
        iconBg: string;
        pillBg: string;
        pillText: string;
    }
> = {
    'Government Agency': {
        icon: agencyIcon,
        iconBg: 'bg-[#eff6ff]',
        pillBg: 'bg-[#dbeafe]',
        pillText: 'text-[#1447e6]',
    },
    'Research Consortium': {
        icon: consortiumIcon,
        iconBg: 'bg-[#ecfdf5]',
        pillBg: 'bg-[#d0fae5]',
        pillText: 'text-[#007a55]',
    },
    'Higher Education Institution': {
        icon: heiIcon,
        iconBg: 'bg-[#faf5ff]',
        pillBg: 'bg-[#f3e8ff]',
        pillText: 'text-[#8200db]',
    },
};

export default function Agencies() {
    const { auth } = usePage().props as { auth: { user: unknown | null } };

    return (
        <>
            <Head title="Participating Agencies">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-[#f9fafb] text-[#0f172a] [font-family:Inter,sans-serif]">
                <header className="border-b border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                    <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-6">
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

                        <nav className="ml-auto flex items-center gap-1">
                            <Link href="/browse-research" className="rounded-lg px-3 py-2 text-sm text-[#6b7280]">
                                Browse Research
                            </Link>
                            <span className="rounded-lg bg-[#eff6ff] px-3 py-2 text-sm text-[#1e3a8a]">
                                Agencies
                            </span>
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

                <main className="mx-auto w-full max-w-[1200px] px-6 pt-8 pb-16">
                    <section>
                        <h1 className="text-[28px] leading-[42px] font-bold text-[#1e3a8a]">
                            Participating Agencies in Davao Region
                        </h1>
                        <p className="mt-2 max-w-[768px] text-base leading-6 text-[#6b7280]">
                            Explore government agencies, research institutions, and regional R&amp;D
                            consortia contributing research to the Regionwide Integrated Knowledge
                            Management System.
                        </p>
                    </section>

                    <section className="mt-8 rounded-[14px] border border-[#f3f4f6] bg-white p-[21px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <div className="relative">
                            <img
                                src={searchIcon}
                                alt=""
                                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                            />
                            <input
                                type="text"
                                placeholder="Search agencies"
                                readOnly
                                className="h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[rgba(10,10,10,0.5)] outline-none"
                            />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#1e3a8a] px-3 py-1.5 text-sm leading-5 font-medium text-white">
                                All (9)
                            </span>
                            <span className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm leading-5 font-medium text-[#6b7280]">
                                Government Agency (5)
                            </span>
                            <span className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm leading-5 font-medium text-[#6b7280]">
                                Research Consortium (3)
                            </span>
                            <span className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm leading-5 font-medium text-[#6b7280]">
                                Higher Education Institution (1)
                            </span>
                        </div>
                    </section>

                    <p className="mt-8 text-sm leading-5 text-[#6b7280]">Showing 9 agencies</p>

                    <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {agencies.map((agency) => {
                            const meta = categoryMeta[agency.type];

                            return (
                                <article
                                    key={agency.name}
                                    className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 pt-6 pb-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="flex items-start justify-between">
                                        <span
                                            className={`flex h-14 w-14 items-center justify-center rounded-[14px] ${meta.iconBg}`}
                                        >
                                            <img src={meta.icon} alt="" className="h-7 w-7" />
                                        </span>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs leading-4 font-medium ${meta.pillBg} ${meta.pillText}`}
                                        >
                                            {agency.type}
                                        </span>
                                    </div>

                                    <h3 className="mt-4 text-base leading-6 font-semibold text-[#1e3a8a]">
                                        {agency.name}
                                    </h3>
                                    <p className="mt-1 min-h-[38.5px] text-sm leading-[19.25px] text-[#6b7280]">
                                        {agency.fullName}
                                    </p>
                                    <p className="mt-3 h-10 overflow-hidden text-sm leading-5 text-[#6b7280]">
                                        {agency.description}
                                    </p>
                                    <p className="mt-4 inline-flex items-center gap-1 text-sm leading-5 font-medium text-[#6b7280]">
                                        <img src={publicationsIcon} alt="" className="h-4 w-4" />
                                        {agency.publications}
                                    </p>

                                    <a
                                        href="#"
                                        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white"
                                    >
                                        <span>View Agency Profile</span>
                                        <img src={arrowIcon} alt="" className="h-[14px] w-[14px]" />
                                    </a>
                                </article>
                            );
                        })}
                    </section>
                </main>

                <footer className="bg-[#1e3a8a] px-6 pt-12 pb-12">
                    <div className="mx-auto w-full max-w-[1200px]">
                        <div className="grid gap-8 md:grid-cols-3">
                            <div>
                                <Link href={home()} className="inline-flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.2)]">
                                        <img src={brandIcon} alt="RIKMS" className="h-5 w-5" />
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
