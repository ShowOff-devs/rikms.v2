import { Link } from '@inertiajs/react';
import { ArrowRight, Building2, Calendar, Download, ExternalLink } from 'lucide-react';
import type { ResearchRecord } from '@/types/research';

type ResearchCardProps = {
    research: ResearchRecord;
};

const formatDownloads = (downloads: number) =>
    `${new Intl.NumberFormat('en-US').format(downloads)} downloads`;

const accessMeta = {
    public: {
        label: 'Public Download',
        className: 'bg-[#ecfdf5] text-[#047857]',
    },
    restricted: {
        label: 'Request Access',
        className: 'bg-[#fff7ed] text-[#c2410c]',
    },
    embargo: {
        label: 'Embargoed',
        className: 'bg-[#fef3c7] text-[#92400e]',
    },
    external: {
        label: 'External Source',
        className: 'bg-[#eff6ff] text-[#1d4ed8]',
    },
} as const;

export default function ResearchCard({ research }: ResearchCardProps) {
    const access = accessMeta[research.accessLevel];

    return (
        <article className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 pt-6 pb-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="flex flex-wrap gap-2">
                {research.tags.map((tag) => {
                    const isCategory = tag.type === 'category';

                    return (
                        <span
                            key={`${research.id}-${tag.label}`}
                            className={
                                isCategory
                                    ? 'rounded-full px-2 py-0.5 text-xs leading-4 text-[#6b7280]'
                                    : 'rounded-full px-2 py-0.5 text-xs leading-4 font-medium text-white'
                            }
                            style={{ backgroundColor: tag.color }}
                        >
                            {tag.label}
                        </span>
                    );
                })}
                <span
                    className={`rounded-full px-2 py-0.5 text-xs leading-4 font-medium ${access.className}`}
                >
                    {access.label}
                </span>
            </div>

            <Link
                href={`/browse-research/${research.id}`}
                className="mt-2 block text-[16.8px] leading-[25.2px] font-semibold text-[#1e3a8a] hover:underline"
            >
                {research.title}
            </Link>

            <p className="text-xs leading-4 text-[#6b7280]">
                {research.authors.join(', ')}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-[#6b7280]">
                <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3" />
                    {research.agency}
                </span>
                <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {research.publicationYear}
                </span>
                <span className="inline-flex items-center gap-1">
                    <Download className="size-3" />
                    {formatDownloads(research.downloads)}
                </span>
            </div>

            <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#6b7280]">
                {research.abstract}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                    href={`/browse-research/${research.id}`}
                    className="inline-flex h-[38px] items-center gap-1 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white"
                >
                    <span>View Details</span>
                    <ArrowRight className="size-3" />
                </Link>
                {research.accessLevel === 'public' ? (
                    <button
                        type="button"
                        className="inline-flex h-[38px] items-center gap-1 rounded-[10px] border border-[#1e3a8a] px-4 text-sm leading-5 font-medium text-[#1e3a8a]"
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <Download className="size-3" />
                        <span>Download PDF</span>
                    </button>
                ) : null}
                {research.accessLevel === 'restricted' ||
                research.accessLevel === 'embargo' ? (
                    <Link
                        href={`/browse-research/${research.id}#request-access`}
                        className="inline-flex h-[38px] items-center gap-1 rounded-[10px] border border-[#1e3a8a] px-4 text-sm leading-5 font-medium text-[#1e3a8a]"
                    >
                        <span>Request Access</span>
                    </Link>
                ) : null}
                {research.accessLevel === 'external' &&
                research.externalUrl ? (
                    <a
                        href={research.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-[38px] items-center gap-1 rounded-[10px] border border-[#1e3a8a] px-4 text-sm leading-5 font-medium text-[#1e3a8a]"
                    >
                        <ExternalLink className="size-3" />
                        <span>External Source</span>
                    </a>
                ) : null}
            </div>
        </article>
    );
}
