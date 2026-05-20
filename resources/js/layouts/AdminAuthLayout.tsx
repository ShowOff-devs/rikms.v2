import { BookOpen, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';

type AdminAuthLayoutProps = {
    children: ReactNode;
};

const adminStats = [
    { value: '9', label: 'Agencies' },
    { value: '250+', label: 'Research' },
    { value: '50+', label: 'Users' },
];

export default function AdminAuthLayout({ children }: AdminAuthLayoutProps) {
    return (
        <main className="min-h-screen bg-white text-[#364153]">
            <div className="grid min-h-screen lg:grid-cols-[55fr_45fr]">
                <section className="relative flex min-h-[390px] overflow-hidden bg-[#1e3a8a] text-white lg:min-h-screen">
                    <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:192px_192px] opacity-[0.06]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_26%)]" />
                    <div className="absolute -top-32 -left-32 size-80 rounded-full border border-white/[0.05]" />
                    <div className="absolute top-1/4 right-[6%] size-40 rounded-full border border-white/[0.03]" />
                    <div className="absolute -right-28 -bottom-28 size-64 rounded-full border border-white/[0.05]" />

                    <div className="relative mx-auto flex w-full max-w-[512px] flex-col items-center justify-center px-6 py-12 text-center sm:px-8 lg:py-0">
                        <div className="flex size-16 items-center justify-center rounded-[16px] border border-white/10 bg-white/10">
                            <BookOpen className="size-8" aria-hidden="true" />
                        </div>

                        <h1 className="mt-6 text-[32px] leading-[38px] font-bold tracking-normal">
                            RIKMS System
                            <br />
                            Administration
                        </h1>

                        <p className="mt-4 max-w-[507px] text-[15px] leading-6 text-white/60">
                            Secure administrative access to the Regionwide
                            Integrated Knowledge Management System.
                        </p>

                        <div className="mt-7 flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.07] px-5 py-3 text-left">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ffb900]/15 text-[#ffb900]">
                                <LockKeyhole
                                    className="size-[18px]"
                                    aria-hidden="true"
                                />
                            </div>
                            <div>
                                <p className="text-sm leading-5 font-semibold">
                                    Restricted Access
                                </p>
                                <p className="text-xs leading-4 text-white/50">
                                    Authorized personnel only.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 grid w-full grid-cols-3 gap-4">
                            {adminStats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-[14px] border border-white/[0.08] bg-white/[0.05] px-2 py-3"
                                >
                                    <p className="text-lg leading-7 font-bold">
                                        {stat.value}
                                    </p>
                                    <p className="text-[11px] leading-4 font-medium text-white/40">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="flex min-h-[640px] items-center justify-center bg-white px-6 py-10 sm:px-8 lg:min-h-screen lg:px-12">
                    <div className="w-full max-w-[420px]">{children}</div>
                </section>
            </div>
        </main>
    );
}
