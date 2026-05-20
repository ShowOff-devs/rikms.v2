import { Link } from '@inertiajs/react';
import { BarChart3, ExternalLink, Settings } from 'lucide-react';

type AgencyQuickLinksProps = {
    agencySlug: string;
};

export function AgencyQuickLinks({ agencySlug }: AgencyQuickLinksProps) {
    const links = [
        {
            label: 'Agency Settings',
            href: '/agency/settings',
            icon: Settings,
        },
        {
            label: 'Research Analytics',
            href: '/agency/analytics',
            icon: BarChart3,
        },
        {
            label: 'View Public Profile',
            href: `/agencies?agency=${agencySlug}`,
            icon: ExternalLink,
        },
    ];

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="border-b border-[#f3f4f6] px-5 py-4">
                <h2 className="text-sm leading-5 font-bold text-[#1e3a8a]">
                    Quick Links
                </h2>
            </div>
            <div className="space-y-2 px-5 py-4">
                {links.map((link) => (
                    <Link
                        key={link.label}
                        href={link.href}
                        className="flex h-6 items-center gap-2 text-sm leading-5 font-medium text-[#4a5565] hover:text-[#1e3a8a]"
                    >
                        <link.icon className="size-3.5" />
                        {link.label}
                    </Link>
                ))}
            </div>
        </section>
    );
}
