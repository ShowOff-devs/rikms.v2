import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';

export type PolicyKey =
    | 'privacy-policy'
    | 'terms-of-use'
    | 'open-access-policy'
    | 'submission-guidelines';

export type PolicySectionLink = {
    id: string;
    label: string;
};

const relatedPolicies: Array<{
    key: PolicyKey;
    label: string;
    href: string;
}> = [
    {
        key: 'privacy-policy',
        label: 'Privacy Policy',
        href: '/privacy-policy',
    },
    {
        key: 'terms-of-use',
        label: 'Terms of Use',
        href: '/terms-of-use',
    },
    {
        key: 'open-access-policy',
        label: 'Open Access Policy',
        href: '/open-access-policy',
    },
    {
        key: 'submission-guidelines',
        label: 'Submission Guidelines',
        href: '/submission-guidelines',
    },
];

type PolicyPageLayoutProps = {
    currentPage: PolicyKey;
    title: string;
    description: string;
    sections: PolicySectionLink[];
    children: ReactNode;
};

export default function PolicyPageLayout({
    currentPage,
    title,
    description,
    sections,
    children,
}: PolicyPageLayoutProps) {
    return (
        <>
            <Head title={`${title} | RIKMS`}>
                <meta name="description" content={description} />
            </Head>

            <div className="flex min-h-screen flex-col bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar />

                <main className="w-full flex-1 px-4 py-10 sm:px-6 sm:py-14">
                    <article className="mx-auto max-w-5xl overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <header className="border-b border-[#e5e7eb] px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
                            <nav
                                aria-label="Breadcrumb"
                                className="flex flex-wrap items-center gap-2 text-sm text-[#6b7280]"
                            >
                                <Link
                                    href="/"
                                    className="rounded text-[#1e3a8a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                                >
                                    Home
                                </Link>
                                <span aria-hidden="true">/</span>
                                <span aria-current="page">{title}</span>
                            </nav>

                            <h1 className="mt-5 text-[30px] leading-10 font-bold text-[#1e3a8a] sm:text-[36px] sm:leading-[44px]">
                                {title}
                            </h1>
                            <p className="mt-4 max-w-4xl text-base leading-7 text-[#4b5563]">
                                {description}
                            </p>

                            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                                <div className="rounded-[10px] bg-[#f9fafb] px-4 py-3">
                                    <dt className="font-semibold text-[#374151]">
                                        Effective Date
                                    </dt>
                                    <dd className="mt-1 text-[#6b7280]">
                                        [Effective Date]
                                    </dd>
                                </div>
                                <div className="rounded-[10px] bg-[#f9fafb] px-4 py-3">
                                    <dt className="font-semibold text-[#374151]">
                                        Last Updated
                                    </dt>
                                    <dd className="mt-1 text-[#6b7280]">
                                        [Last Updated]
                                    </dd>
                                </div>
                            </dl>
                        </header>

                        <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
                            <nav
                                aria-labelledby="policy-table-of-contents"
                                className="rounded-[12px] border border-[#dbeafe] bg-[#eff6ff] px-5 py-5 sm:px-6"
                            >
                                <h2
                                    id="policy-table-of-contents"
                                    className="text-base font-semibold text-[#1e3a8a]"
                                >
                                    On this page
                                </h2>
                                <ol className="mt-3 grid list-decimal gap-x-8 gap-y-2 pl-5 text-sm leading-6 text-[#374151] md:grid-cols-2">
                                    {sections.map((section) => (
                                        <li key={section.id}>
                                            <a
                                                href={`#${section.id}`}
                                                className="rounded hover:text-[#1e3a8a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                                            >
                                                {section.label}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </nav>

                            <div className="mt-10 space-y-10">{children}</div>

                            <nav
                                aria-labelledby="related-policies-heading"
                                className="mt-12 border-t border-[#e5e7eb] pt-8"
                            >
                                <h2
                                    id="related-policies-heading"
                                    className="text-lg font-semibold text-[#1e3a8a]"
                                >
                                    Related Policies
                                </h2>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {relatedPolicies.map((policy) =>
                                        policy.key === currentPage ? (
                                            <span
                                                key={policy.key}
                                                aria-current="page"
                                                className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white"
                                            >
                                                {policy.label}
                                            </span>
                                        ) : (
                                            <Link
                                                key={policy.key}
                                                href={policy.href}
                                                className="rounded-full border border-[#bfdbfe] px-4 py-2 text-sm font-medium text-[#1e3a8a] hover:bg-[#eff6ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                                            >
                                                {policy.label}
                                            </Link>
                                        ),
                                    )}
                                </div>
                            </nav>
                        </div>
                    </article>
                </main>

                <PortalFooter />
            </div>
        </>
    );
}

type PolicySectionProps = {
    id: string;
    title: string;
    children: ReactNode;
};

export function PolicySection({ id, title, children }: PolicySectionProps) {
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-[22px] leading-8 font-bold text-[#1e3a8a]">
                {title}
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-7 break-words text-[#374151]">
                {children}
            </div>
        </section>
    );
}

export function PolicySubsection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div>
            <h3 className="text-base font-semibold text-[#1e3a8a]">{title}</h3>
            <div className="mt-2 space-y-3">{children}</div>
        </div>
    );
}

export function PolicyList({
    items,
    ordered = false,
}: {
    items: string[];
    ordered?: boolean;
}) {
    const className = ordered
        ? 'list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[#1e3a8a]'
        : 'list-disc space-y-2 pl-6 marker:text-[#1e3a8a]';

    return ordered ? (
        <ol className={className}>
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ol>
    ) : (
        <ul className={className}>
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
}

export function AccessClassificationCards() {
    const classifications = [
        {
            name: 'Public',
            description:
                'Research metadata and authorized documents may be publicly accessed.',
        },
        {
            name: 'Restricted',
            description:
                'Selected metadata may remain publicly discoverable while access to the complete document requires authorization.',
        },
        {
            name: 'Archived',
            description:
                'The record is retained for institutional, administrative, historical, audit, or preservation purposes but is not normally publicly accessible.',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {classifications.map((classification) => (
                <article
                    key={classification.name}
                    className="rounded-[12px] border border-[#dbeafe] bg-[#f9fafb] p-5"
                >
                    <h3 className="text-sm font-bold tracking-wide text-[#1e3a8a] uppercase">
                        {classification.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                        {classification.description}
                    </p>
                </article>
            ))}
        </div>
    );
}
