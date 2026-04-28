import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, home, login } from '@/routes';

const sdgImage =
    '/assets/figma/42d14cfb-2fad-4e38-a1b2-e898af377d4d.png';
const iconKnowledge =
    '/assets/figma/a5bc0566-cb45-4139-830f-6a776a0e6693.svg';
const iconVision =
    '/assets/figma/91a2c814-126e-4319-8a3c-51b76a64831c.svg';
const iconMission =
    '/assets/figma/fe1e2c6c-d0b8-4eed-bb3a-7d82b88a3f5d.svg';
const iconAccessibility =
    '/assets/figma/5483925d-1c71-46ea-8979-0f748df63e0e.svg';
const iconSharing =
    '/assets/figma/61524f75-c54e-4aa6-8a1a-88e594bb400b.svg';
const iconSustainable =
    '/assets/figma/43b9dee7-5ded-4572-94f5-b29ba0b9c02f.svg';
const iconSecurity =
    '/assets/figma/b5a65703-7dd6-4f8c-8ca8-b5d8795063ef.svg';
const iconInstitutionA =
    '/assets/figma/a5fd78ce-25ea-46ea-8139-b2f2ceaf5265.svg';
const iconInstitutionB =
    '/assets/figma/a6b43262-afaf-42e1-b3a0-7e5e96d10409.svg';
const iconInstitutionC =
    '/assets/figma/81aac1e4-3d31-4ce3-bc05-2d79e15e8c21.svg';
const iconUserPublic =
    '/assets/figma/aeba4b9b-cb16-4483-b4fe-c565fe5053a8.svg';
const iconUserAgency =
    '/assets/figma/2c4dbb87-a632-4935-b80c-f8c0026385ea.svg';
const iconUserSystem =
    '/assets/figma/c3f31ba3-3449-4379-bad0-2c5957fae6f6.svg';
const iconStatsResearch =
    '/assets/figma/d06ddc58-7acc-4f5d-ae0f-9cef709475f7.svg';
const iconStatsAgencies =
    '/assets/figma/14abb968-a7c8-4da9-a3bb-0e1fc4d586a5.svg';
const iconStatsSdgs =
    '/assets/figma/b21fba21-d3e0-49ad-9778-a87b01ccdbe9.svg';
const iconBrand =
    '/assets/figma/0ca2f834-b195-46fd-8010-3f8d7c6458a7.svg';
const iconSearch =
    '/assets/figma/2a50dc2b-9d2e-4122-8193-8e1a31ddc378.svg';

type Institution = {
    shortName: string;
    fullName: string;
    icon: string;
};

const objectives = [
    {
        title: 'Research Accessibility',
        description:
            'Provide a centralized platform where stakeholders can easily access regional research studies.',
        icon: iconAccessibility,
    },
    {
        title: 'Knowledge Sharing',
        description:
            'Promote collaboration and knowledge exchange among government agencies and research institutions.',
        icon: iconSharing,
    },
    {
        title: 'Sustainable Development',
        description:
            'Support research initiatives aligned with the United Nations Sustainable Development Goals.',
        icon: iconSustainable,
    },
    {
        title: 'Data Integrity and Security',
        description:
            'Ensure that research information is securely managed and maintained with high data integrity.',
        icon: iconSecurity,
    },
];

const institutions: Institution[] = [
    { shortName: 'DOST XI', fullName: 'Department of Science and Technology - Region XI', icon: iconInstitutionA },
    { shortName: 'CHED XI', fullName: 'Commission on Higher Education - Region XI', icon: iconInstitutionA },
    {
        shortName: 'NEDA XI',
        fullName: 'National Economic and Development Authority - Region XI',
        icon: iconInstitutionA,
    },
    { shortName: 'DTI XI', fullName: 'Department of Trade and Industry - Region XI', icon: iconInstitutionA },
    {
        shortName: 'DICT XI',
        fullName: 'Department of Information and Communications Technology - Region XI',
        icon: iconInstitutionA,
    },
    {
        shortName: 'RHRDC XI',
        fullName: 'Regional Health Research and Development Consortium XI',
        icon: iconInstitutionB,
    },
    {
        shortName: 'DRIEERDC',
        fullName:
            'Davao Region Industry Energy and Emerging Technology Research and Development Consortium',
        icon: iconInstitutionB,
    },
    {
        shortName: 'SMAARRDEC',
        fullName:
            'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        icon: iconInstitutionB,
    },
    { shortName: 'USEP', fullName: 'University of Southeastern Philippines', icon: iconInstitutionC },
];

export default function About() {
    const { auth } = usePage().props as { auth: { user: unknown | null } };

    return (
        <>
            <Head title="About RIKMS">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-[#f9fafb] text-[#0f172a] [font-family:Inter,sans-serif]">
                <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                    <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center px-6">
                        <Link href={home()} className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1e3a8a]">
                                <img src={iconBrand} alt="RIKMS icon" className="h-5 w-5" />
                            </span>
                            <span className="text-[17.6px] leading-[26.4px] font-bold tracking-[-0.44px] text-[#1e3a8a]">
                                RIKMS
                            </span>
                        </Link>

                        <div className="ml-[116px] hidden w-[448px] items-center rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 lg:flex">
                            <img src={iconSearch} alt="" className="h-4 w-4" />
                            <span className="ml-3 text-sm text-[#0a0a0a80]">
                                Search research, keywords, agencies, or SDGs
                            </span>
                        </div>

                        <nav className="ml-auto flex items-center gap-1">
                            <Link href="/browse-research" className="rounded-lg px-3 py-2 text-sm text-[#6b7280]">
                                Browse Research
                            </Link>
                            <a href="/#agencies" className="rounded-lg px-3 py-2 text-sm text-[#6b7280]">
                                Agencies
                            </a>
                            <span className="rounded-lg bg-[#eff6ff] px-3 py-2 text-sm text-[#1e3a8a]">
                                About
                            </span>
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

                <section
                    className="bg-[#1e3a8a] py-20"
                    style={{
                        backgroundImage:
                            'linear-gradient(168deg, rgb(30, 58, 138) 0%, rgb(45, 75, 160) 100%)',
                    }}
                >
                    <div className="mx-auto max-w-[1200px] px-6 text-center">
                        <h1 className="mx-auto max-w-[760px] text-[30px] leading-[37.5px] font-bold text-white">
                            About the Regionwide Integrated Knowledge Management System
                        </h1>
                        <p className="mx-auto mt-4 max-w-[766px] text-[16px] leading-[26px] text-[#dbeafe]">
                            The Regionwide Integrated Knowledge Management System (RIKMS) is a
                            centralized digital platform designed to support the management,
                            accessibility, and dissemination of research studies across the Davao
                            Region.
                        </p>
                    </div>
                </section>

                <section className="mx-auto mt-16 grid w-full max-w-[1200px] gap-10 px-6 lg:grid-cols-2">
                    <div>
                        <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                            What is RIKMS?
                        </h2>
                        <p className="mt-4 text-[16px] leading-[26px] text-[#374151]">
                            The Regionwide Integrated Knowledge Management System (RIKMS) serves as
                            a centralized repository of research studies conducted by government
                            agencies, research consortia, and academic institutions within the Davao
                            Region.
                        </p>
                        <p className="mt-4 text-[16px] leading-[26px] text-[#374151]">
                            The platform enhances research visibility, accessibility, and
                            collaboration among stakeholders while supporting evidence-based
                            decision-making and regional innovation.
                        </p>
                    </div>
                    <article className="rounded-2xl border border-[#f3f4f6] bg-[#f9fafb] px-10 py-11 text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)]">
                            <img src={iconKnowledge} alt="" className="h-10 w-10" />
                        </div>
                        <h3 className="mx-auto mt-4 max-w-[302px] text-[17.6px] leading-[26.4px] font-semibold text-[#1e3a8a]">
                            Knowledge-Driven Regional Development
                        </h3>
                        <p className="mx-auto mt-3 max-w-[302px] text-[14px] leading-5 text-[#6b7280]">
                            Empowering innovation through accessible research and cross-institutional
                            collaboration
                        </p>
                    </article>
                </section>

                <section className="mx-auto mt-16 grid w-full max-w-[1200px] gap-6 px-6 md:grid-cols-2">
                    <article className="rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] p-8 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(30,58,138,0.1)]">
                                <img src={iconVision} alt="" className="h-6 w-6" />
                            </span>
                            <h3 className="text-[20px] leading-[30px] font-bold text-[#1e3a8a]">
                                Vision
                            </h3>
                        </div>
                        <p className="mt-4 text-[16px] leading-[26px] text-[#374151]">
                            To become the leading regional knowledge platform that promotes research
                            collaboration, innovation, and evidence-based development across the
                            Davao Region.
                        </p>
                    </article>
                    <article className="rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] p-8 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(30,58,138,0.1)]">
                                <img src={iconMission} alt="" className="h-6 w-6" />
                            </span>
                            <h3 className="text-[20px] leading-[30px] font-bold text-[#1e3a8a]">
                                Mission
                            </h3>
                        </div>
                        <p className="mt-4 text-[16px] leading-[26px] text-[#374151]">
                            To provide a secure and accessible platform that enables government
                            agencies, research consortia, and academic institutions to manage,
                            share, and disseminate research studies that support sustainable
                            development and regional growth.
                        </p>
                    </article>
                </section>

                <section className="mx-auto mt-16 w-full max-w-[1200px] px-6">
                    <div className="text-center">
                        <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                            System Objectives
                        </h2>
                        <p className="mt-2 text-[16px] leading-6 text-[#6b7280]">
                            The core goals driving the development and operation of RIKMS
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {objectives.map((objective) => (
                            <article
                                key={objective.title}
                                className="rounded-[14px] border border-[#f3f4f6] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                            >
                                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(30,58,138,0.1)]">
                                    <img src={objective.icon} alt="" className="h-6 w-6" />
                                </span>
                                <h3 className="mt-4 text-[16px] leading-6 font-semibold text-[#1e3a8a]">
                                    {objective.title}
                                </h3>
                                <p className="mt-2 text-[14px] leading-[22.75px] text-[#6b7280]">
                                    {objective.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-16 bg-white py-16">
                    <div className="mx-auto w-full max-w-[1200px] px-6 text-center">
                        <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                            Supporting the Sustainable Development Goals
                        </h2>
                        <div className="mx-auto mt-10 max-w-[800px] overflow-hidden rounded-[10px]">
                            <img src={sdgImage} alt="The 17 United Nations Sustainable Development Goals" />
                        </div>
                        <p className="mx-auto mt-10 max-w-[672px] text-[14px] leading-[22.75px] text-[#6b7280]">
                            Research studies within RIKMS are categorized according to the 17
                            Sustainable Development Goals to demonstrate their contribution to
                            sustainable regional development.
                        </p>
                    </div>
                </section>

                <section className="mx-auto mt-16 w-full max-w-[1200px] px-6">
                    <div className="text-center">
                        <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                            Participating Institutions
                        </h2>
                        <p className="mt-2 text-[16px] leading-6 text-[#6b7280]">
                            Government agencies, research consortia, and academic institutions in the
                            Davao Region
                        </p>
                    </div>
                    <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {institutions.map((institution) => (
                            <article
                                key={institution.shortName}
                                className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                            >
                                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)]">
                                    <img src={institution.icon} alt="" className="h-7 w-7" />
                                </span>
                                <h3 className="mt-4 text-[13.6px] leading-[20.4px] font-semibold text-[#1e3a8a]">
                                    {institution.shortName}
                                </h3>
                                <p className="mt-1 text-[12px] leading-4 text-[#6b7280]">
                                    {institution.fullName}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-16 bg-white py-16">
                    <div className="mx-auto w-full max-w-[1200px] px-6">
                        <div className="text-center">
                            <h2 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                                System Users
                            </h2>
                            <p className="mt-2 text-[16px] leading-6 text-[#6b7280]">
                                Who can use the RIKMS platform
                            </p>
                        </div>
                        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {[
                                {
                                    title: 'Public Users',
                                    description: 'Can browse and access published research studies.',
                                    icon: iconUserPublic,
                                },
                                {
                                    title: 'Agency Administrators',
                                    description:
                                        'Responsible for uploading and managing research studies from their respective institutions.',
                                    icon: iconUserAgency,
                                },
                                {
                                    title: 'System Administrators',
                                    description: 'Manage agencies, users, and system governance.',
                                    icon: iconUserSystem,
                                },
                            ].map((userType) => (
                                <article
                                    key={userType.title}
                                    className="rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] px-8 py-8 text-center"
                                >
                                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,58,138,0.1)]">
                                        <img src={userType.icon} alt="" className="h-8 w-8" />
                                    </span>
                                    <h3 className="mt-4 text-[16.8px] leading-[25.2px] font-semibold text-[#1e3a8a]">
                                        {userType.title}
                                    </h3>
                                    <p className="mx-auto mt-2 max-w-[304px] text-[14px] leading-[22.75px] text-[#6b7280]">
                                        {userType.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    className="px-6 py-16"
                    style={{
                        backgroundImage:
                            'linear-gradient(166deg, rgb(30, 58, 138) 0%, rgb(45, 75, 160) 100%)',
                    }}
                >
                    <div className="mx-auto max-w-[1200px] text-center">
                        <h2 className="text-[24px] leading-9 font-bold text-white">
                            Advancing Research in the Davao Region
                        </h2>
                        <p className="mx-auto mt-3 max-w-[672px] text-[16px] leading-[26px] text-[#dbeafe]">
                            RIKMS strengthens research collaboration and innovation across the Davao
                            Region by providing a unified platform for knowledge management,
                            enabling data-driven decision-making and evidence-based policy
                            development for regional growth.
                        </p>
                        <div className="mx-auto mt-10 grid max-w-[672px] gap-6 md:grid-cols-3">
                            {[
                                { value: '730', label: 'Total Research Studies', icon: iconStatsResearch },
                                { value: '9', label: 'Participating Agencies', icon: iconStatsAgencies },
                                { value: '17', label: 'SDGs Covered', icon: iconStatsSdgs },
                            ].map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <span className="mx-auto flex h-6 w-6 items-center justify-center">
                                        <img src={stat.icon} alt="" className="h-6 w-6" />
                                    </span>
                                    <p className="mt-2 text-[32px] leading-[48px] font-bold text-white">
                                        {stat.value}
                                    </p>
                                    <p className="text-[14px] leading-5 text-[#bedbff]">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <footer className="bg-[#1e3a8a] px-6 pt-12 pb-12">
                    <div className="mx-auto w-full max-w-[1200px]">
                        <div className="grid gap-8 md:grid-cols-3">
                            <div>
                                <Link href={home()} className="inline-flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.2)]">
                                        <img src={iconBrand} alt="RIKMS" className="h-5 w-5" />
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
                                        <a href="/#agencies">Agencies</a>
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
