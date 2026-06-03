import { FileText, Mail, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    repositoryAccessTypeLabels,
    repositoryDocumentTypeColors,
    repositoryDocumentTypeLabels,
    repositorySdgColors,
    repositoryStatusLabels,
} from '@/data/repository-display';
import type { RepositoryItem } from '@/types/repository';

export function ResearchViewModal({
    item,
    open,
    onOpenChange,
}: {
    item: RepositoryItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!item) {
        return null;
    }

    const typeColor = repositoryDocumentTypeColors[item.documentType];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[16px] border-[#e5e7eb] bg-white p-0 sm:max-w-[760px]">
                <DialogHeader className="border-b border-[#e5e7eb] px-6 pt-6 pb-4">
                    <DialogTitle className="text-xl font-bold text-[#101828]">
                        Research Details
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#6a7282]">
                        View-only metadata summary for the selected agency
                        repository record.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="inline-flex h-[24px] items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
                            style={{
                                backgroundColor: '#f5f3ff',
                                color: typeColor,
                            }}
                        >
                            <FileText className="size-3.5" />
                            {repositoryDocumentTypeLabels[item.documentType]}
                        </span>
                        <DetailBadge label={String(item.year)} />
                        <DetailBadge
                            label={repositoryStatusLabels[item.status]}
                        />
                        <DetailBadge
                            label={repositoryAccessTypeLabels[item.accessType]}
                        />
                    </div>

                    <h2 className="mt-4 text-xl leading-7 font-bold text-[#101828]">
                        {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a7282]">
                        {item.abstract}
                    </p>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <DetailBlock label="Authors">
                            <div className="space-y-2">
                                {item.authors.map((author) => (
                                    <div key={author.email}>
                                        <p className="text-sm font-semibold text-[#364153]">
                                            {author.name}
                                        </p>
                                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#6a7282]">
                                            <Mail className="size-3" />
                                            {author.email}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </DetailBlock>
                        <DetailBlock label="Agency">{item.agency}</DetailBlock>
                        <DetailBlock label="Category">
                            {item.category}
                        </DetailBlock>
                        <DetailBlock label="File Name">
                            {item.file?.name ?? 'No file metadata'}
                        </DetailBlock>
                        <DetailBlock label="Metadata Completion">
                            {item.metadataCompletion}%
                        </DetailBlock>
                        <DetailBlock label="Digital Library Readiness">
                            {item.digitalLibraryScore}%
                        </DetailBlock>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                                SDG Tags
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.sdgs.map((sdg) => (
                                    <span
                                        key={sdg}
                                        className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white"
                                        style={{
                                            backgroundColor:
                                                repositorySdgColors[sdg] ??
                                                '#1e3a8a',
                                        }}
                                    >
                                        {sdg}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="inline-flex items-center gap-1 text-[10px] font-bold text-[#99a1af] uppercase">
                                <Tag className="size-3" />
                                Keywords
                            </p>
                            <p className="mt-2 text-sm leading-5 text-[#6a7282]">
                                {item.keywords.join(', ') || 'No keywords'}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-[#e5e7eb] px-6 py-4">
                    <DialogClose asChild>
                        <button
                            type="button"
                            className="h-10 rounded-[10px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white"
                        >
                            Close
                        </button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DetailBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex h-[24px] items-center rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2.5 text-[11px] font-semibold text-[#4a5565]">
            {label}
        </span>
    );
}

function DetailBlock({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-[12px] bg-[#f9fafb] p-3">
            <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                {label}
            </p>
            <div className="mt-1 text-sm font-medium text-[#364153]">
                {children}
            </div>
        </div>
    );
}
