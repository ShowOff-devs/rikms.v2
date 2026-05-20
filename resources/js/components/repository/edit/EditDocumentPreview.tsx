import { FileText, Mail, Sparkles, Tag } from 'lucide-react';
import {
    repositoryAccessTypeLabels,
    repositoryDocumentTypeColors,
    repositoryDocumentTypeLabels,
    repositorySdgColors,
    repositoryStatusLabels,
} from '@/data/mock-repository';
import type { RepositoryUpdatePayload } from '@/types/repository';

export function EditDocumentPreview({
    form,
}: {
    form: RepositoryUpdatePayload;
}) {
    const typeColor = repositoryDocumentTypeColors[form.documentType];

    return (
        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="border-b border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                        <FileText className="size-4" />
                        Metadata Preview
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                        {repositoryStatusLabels[form.status]}
                    </span>
                </div>
            </div>
            <div className="p-4">
                <p
                    className="inline-flex h-[21px] items-center rounded-full px-2 text-[10px] font-bold"
                    style={{ backgroundColor: '#f5f3ff', color: typeColor }}
                >
                    {repositoryDocumentTypeLabels[form.documentType]}
                </p>
                <h2 className="mt-3 text-base leading-6 font-bold text-[#101828]">
                    {form.title || 'Untitled research document'}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#6a7282]">
                    {form.abstract || 'No abstract provided.'}
                </p>

                <div className="mt-4 space-y-2">
                    {form.authors.map((author, index) => (
                        <div
                            key={`${author.name}-${index}`}
                            className="rounded-[10px] bg-[#f9fafb] px-3 py-2"
                        >
                            <p className="text-xs font-bold text-[#364153]">
                                {author.name || 'Unnamed author'}
                            </p>
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#6a7282]">
                                <Mail className="size-3" />
                                {author.email || 'No email provided'}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                    {form.sdgs.map((sdg) => (
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
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <PreviewMetric
                        label="Access"
                        value={repositoryAccessTypeLabels[form.accessType]}
                    />
                    <PreviewMetric label="Year" value={String(form.year)} />
                    <PreviewMetric label="Category" value={form.category} />
                    <PreviewMetric
                        label="AI"
                        value={form.isAiTagged ? 'Tagged' : 'Pending'}
                        icon={Sparkles}
                    />
                </div>

                <div className="mt-4 rounded-[10px] border border-[#e5e7eb] p-3">
                    <p className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1e3a8a]">
                        <Tag className="size-3" />
                        Keywords
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                        {form.keywords.join(', ') || 'No keywords added'}
                    </p>
                </div>
            </div>
        </section>
    );
}

function PreviewMetric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon?: typeof Sparkles;
}) {
    return (
        <div className="rounded-[10px] bg-[#f9fafb] px-3 py-2">
            <p className="text-[9px] font-bold text-[#99a1af] uppercase">
                {label}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#364153]">
                {Icon ? <Icon className="size-3" /> : null}
                {value}
            </p>
        </div>
    );
}
