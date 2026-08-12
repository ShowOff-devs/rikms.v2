import { FileText, Mail, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
import { getRepositoryItemById } from '@/lib/repository/repository-service';
import type { RepositoryItem } from '@/types/repository';
import { RevisionRequestPanel } from './RevisionRequestPanel';

export function ResearchViewModal({
    item,
    open,
    onOpenChange,
}: {
    item: RepositoryItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [detailItem, setDetailItem] = useState<RepositoryItem | null>(null);
    const [detailError, setDetailError] = useState<{
        id: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (!open || !item) {
            return;
        }

        let isCurrent = true;

        getRepositoryItemById(item.id)
            .then((record) => {
                if (!isCurrent) {
                    return;
                }

                setDetailItem(record ?? item);
                setDetailError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setDetailError({
                        id: item.id,
                        message: 'Unable to refresh research details.',
                    });
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [item, open]);

    const displayItem =
        detailItem && item && detailItem.id === item.id ? detailItem : item;
    const activeDetailError =
        detailError && item && detailError.id === item.id
            ? detailError.message
            : null;

    if (!displayItem) {
        return null;
    }

    const typeColor = repositoryDocumentTypeColors[displayItem.documentType];

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
                    {activeDetailError ? (
                        <p className="mt-2 text-xs font-medium text-[#e7000b]">
                            {activeDetailError}
                        </p>
                    ) : null}
                </DialogHeader>

                <div className="px-6 py-5">
                    <RevisionRequestPanel item={displayItem} showEditAction />

                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="inline-flex h-[24px] items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
                            style={{
                                backgroundColor: '#f5f3ff',
                                color: typeColor,
                            }}
                        >
                            <FileText className="size-3.5" />
                            {
                                repositoryDocumentTypeLabels[
                                    displayItem.documentType
                                ]
                            }
                        </span>
                        <DetailBadge label={String(displayItem.year)} />
                        <DetailBadge
                            label={repositoryStatusLabels[displayItem.status]}
                        />
                        <DetailBadge
                            label={
                                repositoryAccessTypeLabels[
                                    displayItem.accessType
                                ]
                            }
                        />
                    </div>

                    <h2 className="mt-4 text-xl leading-7 font-bold text-[#101828]">
                        {displayItem.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a7282]">
                        {displayItem.abstract}
                    </p>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <DetailBlock label="Authors">
                            <div className="space-y-2">
                                {displayItem.authors.map((author, index) => (
                                    <div key={`${author.name}-${index}`}>
                                        <p className="text-sm font-semibold text-[#364153]">
                                            {author.name}
                                        </p>
                                        {author.email ? (
                                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#6a7282]">
                                                <Mail className="size-3" />
                                                {author.email}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </DetailBlock>
                        <DetailBlock label="Agency">
                            {displayItem.agency}
                        </DetailBlock>
                        <DetailBlock label="Category">
                            {displayItem.category}
                        </DetailBlock>
                        <DetailBlock label="File Name">
                            {displayItem.file?.name ?? 'No file metadata'}
                        </DetailBlock>
                        <DetailBlock label="Metadata Completion">
                            {displayItem.metadataCompletion}%
                        </DetailBlock>
                        <DetailBlock label="Digital Library Readiness">
                            {displayItem.digitalLibraryScore}%
                        </DetailBlock>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                                SDG Tags
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {displayItem.sdgs.map((sdg) => (
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
                                {displayItem.keywords.join(', ') ||
                                    'No keywords'}
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
