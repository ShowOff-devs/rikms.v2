import { Head, Link } from '@inertiajs/react';
import { Mail, MapPin, Search } from 'lucide-react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';

export default function ContactPage() {
    return (
        <>
            <Head title="Contact and Help" />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar />

                <main className="mx-auto w-full max-w-[1000px] px-4 py-12 sm:px-6">
                    <section className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-8 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                        <h1 className="text-[28px] leading-9 font-bold text-[#1e3a8a]">
                            Contact and Help
                        </h1>
                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#6b7280]">
                            For public research questions, metadata corrections,
                            or access request concerns, contact the RIKMS support
                            desk or the agency listed on the research record.
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            <article className="rounded-[12px] border border-[#f3f4f6] bg-[#f9fafb] p-5">
                                <Mail className="size-6 text-[#1e3a8a]" />
                                <h2 className="mt-3 text-base font-semibold text-[#1e3a8a]">
                                    Email
                                </h2>
                                <a
                                    href="mailto:rikms-support@example.gov.ph"
                                    className="mt-2 block text-sm text-[#6b7280] hover:text-[#1e3a8a]"
                                >
                                    rikms-support@example.gov.ph
                                </a>
                            </article>
                            <article className="rounded-[12px] border border-[#f3f4f6] bg-[#f9fafb] p-5">
                                <MapPin className="size-6 text-[#1e3a8a]" />
                                <h2 className="mt-3 text-base font-semibold text-[#1e3a8a]">
                                    Region
                                </h2>
                                <p className="mt-2 text-sm text-[#6b7280]">
                                    Davao Region, Philippines
                                </p>
                            </article>
                            <article className="rounded-[12px] border border-[#f3f4f6] bg-[#f9fafb] p-5">
                                <Search className="size-6 text-[#1e3a8a]" />
                                <h2 className="mt-3 text-base font-semibold text-[#1e3a8a]">
                                    Public Records
                                </h2>
                                <Link
                                    href="/browse-research"
                                    className="mt-2 block text-sm text-[#6b7280] hover:text-[#1e3a8a]"
                                >
                                    Search the research directory
                                </Link>
                            </article>
                        </div>
                    </section>
                </main>

                <PortalFooter />
            </div>
        </>
    );
}
