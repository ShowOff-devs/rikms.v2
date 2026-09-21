import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function PortalFooter() {
    return (
        <footer className="bg-[#1e3a8a] px-6 pt-12 pb-[43px] text-white xl:px-24 2xl:px-[200px]">
            <div className="mx-auto max-w-[1152px]">
                <div className="grid gap-10 md:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex size-9 items-center justify-center rounded-[10px] bg-white p-1">
                                <AppLogoIcon className="size-8" />
                            </span>
                            <span className="text-[17.6px] leading-[26.4px] font-bold">
                                RIKMS
                            </span>
                        </div>
                        <div className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                            <Link
                                href="/about"
                                className="block hover:text-white"
                            >
                                About
                            </Link>
                            <Link
                                href="/help"
                                className="block hover:text-white"
                            >
                                Help &amp; Support
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-base leading-6 font-semibold">
                            Research
                        </h2>
                        <div className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                            <Link
                                href="/browse-research"
                                className="block hover:text-white"
                            >
                                Browse Research
                            </Link>
                            <Link
                                href="/agencies"
                                className="block hover:text-white"
                            >
                                Agencies
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-base leading-6 font-semibold">
                            Legal
                        </h2>
                        <div className="mt-4 space-y-2 text-sm leading-5 text-[#bedbff]">
                            <Link
                                href="/privacy-policy"
                                className="block hover:text-white"
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                href="/terms-of-use"
                                className="block hover:text-white"
                            >
                                Terms of Use
                            </Link>
                            <Link
                                href="/open-access-policy"
                                className="block hover:text-white"
                            >
                                Open Access Policy
                            </Link>
                            <Link
                                href="/submission-guidelines"
                                className="block hover:text-white"
                            >
                                Submission Guidelines
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-[rgba(255,255,255,0.2)] pt-6 text-center text-sm leading-5 text-[#bedbff]">
                    &copy; 2026 Regionwide Integrated Knowledge Management
                    System (RIKMS)
                </div>
            </div>
        </footer>
    );
}
