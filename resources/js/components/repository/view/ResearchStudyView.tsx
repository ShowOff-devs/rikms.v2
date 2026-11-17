import { Mail, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { repositorySdgColors } from '@/data/repository-display';
import type { RepositoryViewContentProps } from './repository-view-content';

export function ResearchStudyView({ item }: RepositoryViewContentProps) {
    return (
        <div className="space-y-5">
            <section>
                <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                    Research Abstract
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6a7282]">
                    {item.abstract || 'No abstract has been provided.'}
                </p>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                <DetailBlock label="Authors">
                    <div className="space-y-2">
                        {item.authors.length ? (
                            item.authors.map((author, index) => (
                                <div key={`${author.name}-${index}`}>
                                    <p className="font-semibold">
                                        {author.name}
                                    </p>
                                    {author.email ? (
                                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#6a7282]">
                                            <Mail className="size-3" />
                                            {author.email}
                                        </p>
                                    ) : null}
                                </div>
                            ))
                        ) : (
                            <span>No authors listed</span>
                        )}
                    </div>
                </DetailBlock>
                <DetailBlock label="Publication">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                        <dt className="text-[#6a7282]">Agency</dt>
                        <dd>{item.agency || 'Not provided'}</dd>
                        <dt className="text-[#6a7282]">Year</dt>
                        <dd>{item.year}</dd>
                        <dt className="text-[#6a7282]">Category</dt>
                        <dd>{item.category}</dd>
                    </dl>
                </DetailBlock>
                <DetailBlock label="Repository File">
                    <p className="break-words">
                        {item.file?.name ?? 'No file metadata'}
                    </p>
                    {item.file ? (
                        <p className="mt-1 text-xs text-[#6a7282]">
                            {item.file.size} · {item.file.status ?? 'Active'}
                        </p>
                    ) : null}
                </DetailBlock>
                <DetailBlock label="Repository Readiness">
                    <div className="grid grid-cols-2 gap-3">
                        <Metric
                            label="Metadata"
                            value={`${item.metadataCompletion}%`}
                        />
                        <Metric
                            label="Digital Library"
                            value={`${item.digitalLibraryScore}%`}
                        />
                    </div>
                </DetailBlock>
            </section>

            <Taxonomy item={item} />
        </div>
    );
}

export function DetailBlock({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0 rounded-[12px] bg-[#f9fafb] p-4">
            <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                {label}
            </p>
            <div className="mt-2 text-sm font-medium text-[#364153]">
                {children}
            </div>
        </div>
    );
}

export function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                {label}
            </p>
            <p className="mt-1 text-lg font-bold text-[#1e3a8a]">{value}</p>
        </div>
    );
}

export function Taxonomy({ item }: Pick<RepositoryViewContentProps, 'item'>) {
    return (
        <section className="grid gap-4 border-t border-[#e5e7eb] pt-5 md:grid-cols-2">
            <div>
                <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                    SDG Tags
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.sdgs.length ? (
                        item.sdgs.map((sdg) => (
                            <span
                                key={sdg}
                                className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white"
                                style={{
                                    backgroundColor:
                                        repositorySdgColors[sdg] ?? '#1e3a8a',
                                }}
                            >
                                {sdg}
                            </span>
                        ))
                    ) : (
                        <span className="text-sm text-[#6a7282]">
                            No SDGs selected
                        </span>
                    )}
                </div>
            </div>
            <div>
                <p className="inline-flex items-center gap-1 text-[10px] font-bold text-[#99a1af] uppercase">
                    <Tag className="size-3" />
                    Keywords
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.keywords.length ? (
                        item.keywords.map((keyword) => (
                            <span
                                key={keyword}
                                className="rounded-full border border-[#dbeafe] bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#1e3a8a]"
                            >
                                {keyword}
                            </span>
                        ))
                    ) : (
                        <span className="text-sm text-[#6a7282]">
                            No keywords
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
