import { Head } from '@inertiajs/react';
import { CheckCircle2, Download, ShieldAlert } from 'lucide-react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';

type Props = {
    state: 'valid' | 'expired' | 'revoked' | 'invalid';
    researchTitle?: string;
    agencyName?: string;
    expiresAt?: string | null;
    downloadUrl?: string;
};

const stateCopy = {
    expired: 'This approved access link has expired.',
    revoked: 'This approved access link is no longer available.',
    invalid: 'This access link is invalid or no longer available.',
};

export default function ApprovedAccessPage({
    state,
    researchTitle,
    agencyName,
    expiresAt,
    downloadUrl,
}: Props) {
    const valid = state === 'valid';

    return (
        <>
            <Head title="Approved Research Access" />
            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar />
                <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
                    <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-8 shadow-sm sm:px-10">
                        {valid ? (
                            <CheckCircle2 className="size-10 text-[#15803d]" />
                        ) : (
                            <ShieldAlert className="size-10 text-[#b45309]" />
                        )}
                        <h1 className="mt-5 text-[28px] leading-9 font-bold text-[#1e3a8a]">
                            {valid ? 'Your access request has been approved.' : 'Approved access unavailable'}
                        </h1>
                        {valid ? (
                            <>
                                <div className="mt-6 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-5">
                                    <p className="font-semibold text-[#1e3a8a]">{researchTitle}</p>
                                    <p className="mt-1 text-sm text-[#475569]">{agencyName}</p>
                                    {expiresAt && (
                                        <p className="mt-3 text-sm text-[#475569]">
                                            Access expires: {new Date(expiresAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <p className="mt-6 text-sm leading-6 text-[#475569]">
                                    You may download the approved research file using the button below. This access is limited to the approved request and may expire according to the approval terms.
                                </p>
                                <a
                                    href={downloadUrl}
                                    className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#172e6f]"
                                >
                                    <Download className="size-4" />
                                    Download Approved File
                                </a>
                                <p className="mt-5 text-xs leading-5 text-[#64748b]">
                                    This link is for the approved request only. Do not forward it.
                                </p>
                            </>
                        ) : (
                            <p className="mt-4 text-sm leading-6 text-[#475569]">
                                {stateCopy[state]}
                            </p>
                        )}
                    </section>
                </main>
                <PortalFooter />
            </div>
        </>
    );
}
