import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
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
                <section className="grid min-h-[calc(100svh-4rem)] w-full lg:grid-cols-[minmax(420px,46%)_minmax(0,54%)]">
                    <div className="relative overflow-hidden bg-[#1e3a8a] lg:min-h-[720px]">
                        <div className="absolute inset-0 opacity-[0.07] [background:radial-gradient(circle_at_center,rgba(255,255,255,1)_0_1px,rgba(255,255,255,0)_1px_100%)]" />
                        <div className="absolute top-[51%] left-6 size-40 rounded-full border border-[rgba(255,255,255,0.1)] sm:size-48 lg:top-[446px] lg:left-[-96px] lg:size-[256px]" />
                        <div className="absolute top-[140px] right-[-64px] size-32 rounded-full border border-[rgba(255,255,255,0.1)] sm:size-40 lg:top-[208px] lg:size-[192px]" />

                        <div className="relative mx-auto flex h-full max-w-[600px] flex-col items-center justify-center px-6 py-14 text-center sm:px-10 lg:px-12 lg:py-20">
                            <div className="mb-6 flex size-[76px] items-center justify-center rounded-2xl bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.18)] ring-1 ring-white/70">
                                <AppLogoIcon className="size-[60px]" />
                            </div>
                            <h1 className="max-w-[500px] text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-white sm:text-[36px] sm:leading-[44px]">
                                {heroTitle}
                            </h1>
                            <div className="mt-5 h-1 w-14 rounded-full bg-white/40" />
                            <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-white/75 sm:text-base">
                                {heroDescription}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center bg-[#f8fafc] px-4 py-10 sm:px-8 sm:py-14 lg:px-12 xl:px-20">
                        <div className="w-full max-w-[480px] rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
                            {children}
                        </div>
                    </div>
                </section>
            </main>

            <PortalFooter />
        </div>
    );
}
