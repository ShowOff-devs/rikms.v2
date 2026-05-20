import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';

type AgencyPortalShellProps = {
    children: ReactNode;
    heroTitle: string;
    heroDescription: string;
    activeNav?: 'browse-research' | 'agencies' | 'about' | 'login';
};

export default function AgencyPortalShell({
    children,
    heroTitle,
    heroDescription,
    activeNav = 'login',
}: AgencyPortalShellProps) {
    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#0f172a]">
            <PortalNavbar activeNav={activeNav} />

            <main>
                <section className="mx-auto grid min-h-[880px] max-w-[1552px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="relative overflow-hidden bg-[#1e3a8a]">
                        <div className="absolute inset-0 opacity-[0.07] [background:radial-gradient(circle_at_center,rgba(255,255,255,1)_0_1px,rgba(255,255,255,0)_1px_100%)]" />
                        <div className="absolute top-[51%] left-6 size-40 rounded-full border border-[rgba(255,255,255,0.1)] sm:size-48 lg:top-[446px] lg:left-[-96px] lg:size-[256px]" />
                        <div className="absolute top-[140px] right-[-64px] size-32 rounded-full border border-[rgba(255,255,255,0.1)] sm:size-40 lg:top-[208px] lg:size-[192px]" />

                        <div className="mx-auto flex h-full max-w-[512px] flex-col items-center justify-center px-8 py-16 text-center lg:px-0">
                            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.15)]">
                                <BookOpen
                                    className="size-9 text-white"
                                    strokeWidth={1.8}
                                />
                            </div>
                            <h1 className="max-w-[391px] text-[32px] leading-[40px] font-bold text-white">
                                {heroTitle}
                            </h1>
                            <div className="mt-3 h-1 w-14 rounded-full bg-[rgba(255,255,255,0.4)]" />
                            <p className="mt-5 max-w-[472px] text-[15.2px] leading-[24.7px] text-[rgba(255,255,255,0.72)]">
                                {heroDescription}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center bg-[#f9fafb] px-6 py-16 sm:px-10 xl:px-20 2xl:px-[178px]">
                        <div className="w-full max-w-[420px]">{children}</div>
                    </div>
                </section>
            </main>

            <PortalFooter />
        </div>
    );
}
