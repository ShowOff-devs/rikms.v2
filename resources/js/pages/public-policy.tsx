import { Head, Link } from '@inertiajs/react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';

const policyPages = {
    'privacy-policy': {
        title: 'Privacy Policy',
        body: [
            'RIKMS collects only the information needed to support public research discovery, access requests, and institutional knowledge-sharing workflows.',
            'Personal information submitted through public forms is used for evaluation and communication related to the request. It is not sold or used for unrelated marketing activity.',
            'Detailed retention, data-sharing, and security procedures will be aligned with the final institutional data privacy policy before production launch.',
        ],
    },
    'terms-of-use': {
        title: 'Terms of Use',
        body: [
            'Public users may browse research metadata, agency profiles, and open-access records for legitimate education, research, policy, and public-interest purposes.',
            'Users must not attempt to bypass access controls, scrape restricted materials, impersonate requesters, or use RIKMS in a way that disrupts service availability.',
            'Final legal terms will be reviewed by the responsible implementing institutions before production launch.',
        ],
    },
    'open-access-policy': {
        title: 'Open Access Policy',
        body: [
            'RIKMS supports responsible public access to validated research outputs while respecting restrictions, embargoes, institutional approvals, and third-party rights.',
            'Records marked as public may provide direct download or source access. Restricted and embargoed records require the appropriate access request or waiting period.',
            'This placeholder will be replaced by the approved regional open access policy.',
        ],
    },
    'submission-guidelines': {
        title: 'Submission Guidelines',
        body: [
            'Agency administrators are responsible for submitting complete, accurate, and validated research metadata through the agency portal.',
            'Submissions should include title, authors, abstract, publication year, SDG tags, agency ownership, access classification, and supporting files or links where applicable.',
            'Public users should coordinate with the relevant agency for corrections or access concerns.',
        ],
    },
};

type PolicyPageKey = keyof typeof policyPages;

type PublicPolicyPageProps = {
    pageKey?: PolicyPageKey;
};

export default function PublicPolicyPage({
    pageKey = 'privacy-policy',
}: PublicPolicyPageProps) {
    const page = policyPages[pageKey] ?? policyPages['privacy-policy'];

    return (
        <>
            <Head title={page.title} />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar />

                <main className="mx-auto w-full max-w-[920px] px-4 py-12 sm:px-6">
                    <section className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-8 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <h1 className="text-[28px] leading-9 font-bold text-[#1e3a8a]">
                            {page.title}
                        </h1>
                        <p className="mt-2 text-sm text-[#6b7280]">
                            Public portal information page
                        </p>

                        <div className="mt-6 space-y-4 text-sm leading-6 text-[#374151]">
                            {page.body.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/browse-research"
                                className="inline-flex h-10 items-center rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
                            >
                                Browse Research
                            </Link>
                            <Link
                                href="/contact"
                                className="inline-flex h-10 items-center rounded-[10px] border border-[#1e3a8a] px-4 text-sm font-medium text-[#1e3a8a]"
                            >
                                Contact Help
                            </Link>
                        </div>
                    </section>
                </main>

                <PortalFooter />
            </div>
        </>
    );
}
