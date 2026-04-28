import { Link } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';

export default function PortalFooter() {
    return (
        <footer className="bg-[#1e3a8a] px-6 pt-12 pb-10 text-white xl:px-24 2xl:px-[200px]">
            <div className="mx-auto max-w-[1152px]">
                <div className="grid gap-10 md:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex size-8 items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.2)] text-white">
                                <BookOpen className="size-[15px]" strokeWidth={2.2} />
                            </span>
                            <span className="text-[17.6px] leading-[26.4px] font-bold">
                                RIKMS
                            </span>
                        </div>
                        <div className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                            <Link href="/about" className="block hover:text-white">
                                About
                            </Link>
                            <a
                                href="mailto:rikms-support@example.gov.ph"
                                className="block hover:text-white"
                            >
                                Help Center
                            </a>
                            <a
                                href="mailto:rikms-support@example.gov.ph"
                                className="block hover:text-white"
                            >
                                Contact Support
                            </a>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-base leading-6 font-semibold">Research</h2>
                        <div className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                            <Link
                                href="/browse-research"
                                className="block hover:text-white"
                            >
                                Browse Research
                            </Link>
                            <Link href="/agencies" className="block hover:text-white">
                                Agencies
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-base leading-6 font-semibold">Legal</h2>
                        <div className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                            <a href="#" className="block hover:text-white">
                                Privacy Policy
                            </a>
                            <a href="#" className="block hover:text-white">
                                Terms of Service
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-[rgba(255,255,255,0.2)] pt-6 text-center text-sm leading-5 text-[#bedbff]">
                    © 2026 Regionwide Integrated Knowledge Management System
                    (RIKMS). All rights reserved.
                </div>
            </div>
        </footer>
    );
}
