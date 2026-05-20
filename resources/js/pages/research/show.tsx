import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Calendar, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import ResearchEmptyState from '@/components/research/ResearchEmptyState';
import { getResearchRecord } from '@/lib/research/research-service';
import type { ResearchRecord } from '@/types/research';

const getResearchIdFromPath = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return decodeURIComponent(window.location.pathname.split('/').pop() ?? '');
};

export default function ResearchDetailPage() {
    const researchId = useMemo(() => getResearchIdFromPath(), []);
    const [research, setResearch] = useState<ResearchRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCurrent = true;

        getResearchRecord(researchId).then((record) => {
            if (!isCurrent) {
                return;
            }

            setResearch(record);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [researchId]);

    return (
        <>
            <Head title={research?.title ?? 'Research Details'} />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar activeNav="browse-research" />

                <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
                    <Link
                        href="/browse-research"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#1e3a8a] hover:underline"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Browse Research
                    </Link>

                    {isLoading ? (
                        <div className="mt-6 h-[360px] animate-pulse rounded-[14px] border border-[#f3f4f6] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />
                    ) : null}

                    {!isLoading && !research ? (
                        <div className="mt-6">
                            <ResearchEmptyState
                                title="Research record not found"
                                description="The selected research record may have been moved, archived, or made unavailable."
                                actionLabel="Return to research list"
                                onAction={() => {
                                    window.location.href = '/browse-research';
                                }}
                            />
                        </div>
                    ) : null}

                    {!isLoading && research ? (
                        <article className="mt-6 rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-wrap gap-2">
                                {research.tags.map((tag) => (
                                    <span
                                        key={tag.label}
                                        className={
                                            tag.type === 'category'
                                                ? 'rounded-full px-2 py-0.5 text-xs leading-4 text-[#6b7280]'
                                                : 'rounded-full px-2 py-0.5 text-xs leading-4 font-medium text-white'
                                        }
                                        style={{ backgroundColor: tag.color }}
                                    >
                                        {tag.label}
                                    </span>
                                ))}
                            </div>

                            <h1 className="mt-3 max-w-[900px] text-[28px] leading-9 font-bold text-[#1e3a8a]">
                                {research.title}
                            </h1>
                            <p className="mt-2 text-sm leading-5 text-[#6b7280]">
                                {research.authors.join(', ')}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm leading-5 text-[#6b7280]">
                                <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="size-4" />
                                    {research.agency}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="size-4" />
                                    {research.publicationYear}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Download className="size-4" />
                                    {new Intl.NumberFormat('en-US').format(
                                        research.downloads,
                                    )}{' '}
                                    downloads
                                </span>
                            </div>

                            <section className="mt-6 border-t border-[#f3f4f6] pt-6">
                                <h2 className="text-base leading-6 font-semibold text-[#1e3a8a]">
                                    Abstract
                                </h2>
                                <p className="mt-2 max-w-[900px] text-sm leading-6 text-[#374151]">
                                    {research.abstract}
                                </p>
                            </section>
                        </article>
                    ) : null}
                </main>

                <PortalFooter />
            </div>
        </>
    );
}
