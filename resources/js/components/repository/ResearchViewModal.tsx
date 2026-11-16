import { FileText } from 'lucide-react';
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
    repositoryStatusLabels,
} from '@/data/repository-display';
import { getAgencyResearch } from '@/lib/agency/agency-research-service';
import type { AgencyResearchRecord } from '@/lib/agency/agency-research-service';
import { getRepositoryItemById } from '@/lib/repository/repository-service';
import type { RepositoryItem } from '@/types/repository';
import { RevisionRequestPanel } from './RevisionRequestPanel';
import { ProjectAccomplishmentView } from './view/ProjectAccomplishmentView';
import { ResearchStudyView } from './view/ResearchStudyView';
import { TerminalReportView } from './view/TerminalReportView';

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
    const [detailRecord, setDetailRecord] =
        useState<AgencyResearchRecord | null>(null);
    const [detailError, setDetailError] = useState<{
        id: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (!open || !item) {
            return;
        }

        let isCurrent = true;

        Promise.allSettled([
            getRepositoryItemById(item.id),
            getAgencyResearch(item.id),
        ]).then(([repositoryResult, researchResult]) => {
            if (!isCurrent) {
                return;
            }

            if (repositoryResult.status === 'fulfilled') {
                setDetailItem(repositoryResult.value ?? item);
            }

            if (researchResult.status === 'fulfilled') {
                setDetailRecord(researchResult.value);
            }

            if (
                repositoryResult.status === 'rejected' &&
                researchResult.status === 'rejected'
            ) {
                setDetailError({
                    id: item.id,
                    message: 'Unable to refresh research details.',
                });

                return;
            }

            setDetailError(null);
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
    const documentLabel =
        repositoryDocumentTypeLabels[displayItem.documentType];
    const activeDetailRecord =
        detailRecord && String(detailRecord.id) === displayItem.id
            ? detailRecord
            : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[16px] border-[#e5e7eb] bg-white p-0 sm:max-w-[920px]">
                <DialogHeader className="border-b border-[#e5e7eb] px-6 pt-6 pb-4">
                    <DialogTitle className="text-xl font-bold text-[#101828]">
                        {documentLabel} Details
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#6a7282]">
                        View the stored {documentLabel.toLowerCase()} metadata,
                        files, and workflow information.
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
                    <div className="mt-5">
                        {displayItem.documentType === 'terminal-report' ? (
                            <TerminalReportView
                                item={displayItem}
                                record={activeDetailRecord}
                            />
                        ) : displayItem.documentType ===
                          'project-accomplishment' ? (
                            <ProjectAccomplishmentView
                                item={displayItem}
                                record={activeDetailRecord}
                            />
                        ) : (
                            <ResearchStudyView
                                item={displayItem}
                                record={activeDetailRecord}
                            />
                        )}
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
