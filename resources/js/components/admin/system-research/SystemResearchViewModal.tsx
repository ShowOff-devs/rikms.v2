import { CalendarDays, Download, Eye, LockKeyhole, Tags } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    systemResearchAccessTypeLabels,
    systemResearchDocumentTypeLabels,
} from '@/data/mock-system-research';
import type { SystemResearchRecord } from '@/types/system-research';
import { SystemResearchStatusBadge } from './SystemResearchItem';

const numberFormatter = new Intl.NumberFormat('en-US');

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium text-[#99a1af]">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-[#1e2939]">{value}</dd>
        </div>
    );
}

export function SystemResearchViewModal({
    record,
    open,
    onOpenChange,
}: {
    record: SystemResearchRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[760px]">
                {record ? (
                    <>
                        <DialogHeader>
                            <div className="flex flex-wrap items-center gap-2">
                                <SystemResearchStatusBadge
                                    status={record.status}
                                />
                                <span className="rounded-full bg-[rgba(30,58,138,0.05)] px-2.5 py-1 text-xs font-semibold text-[#1e3a8a]">
                                    {record.agencyShortName}
                                </span>
                            </div>
                            <DialogTitle className="text-xl leading-7 text-[#111827]">
                                {record.title}
                            </DialogTitle>
                            <DialogDescription className="text-[#6a7282]">
                                {record.authors.join(', ')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[70vh] overflow-y-auto pr-1">
                            <dl className="grid gap-4 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:grid-cols-3">
                                <DetailItem
                                    label="Agency"
                                    value={record.agencyName}
                                />
                                <DetailItem
                                    label="Year"
                                    value={String(record.year)}
                                />
                                <DetailItem
                                    label="Category"
                                    value={record.category}
                                />
                                <DetailItem
                                    label="Document Type"
                                    value={
                                        systemResearchDocumentTypeLabels[
                                            record.documentType
                                        ]
                                    }
                                />
                                <DetailItem
                                    label="Access Type"
                                    value={
                                        systemResearchAccessTypeLabels[
                                            record.accessType
                                        ]
                                    }
                                />
                                <DetailItem
                                    label="Uploaded Date"
                                    value={record.uploadedAt}
                                />
                            </dl>

                            <div className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                                <h3 className="text-sm font-semibold text-[#1e2939]">
                                    Abstract
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-[#4a5565]">
                                    {record.abstract ??
                                        'No abstract has been provided for this record.'}
                                </p>
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-[#99a1af]">
                                        <Download
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Downloads
                                    </div>
                                    <p className="mt-2 text-xl font-bold text-[#1e2939]">
                                        {numberFormatter.format(
                                            record.downloads,
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-[#99a1af]">
                                        <Eye
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Views
                                    </div>
                                    <p className="mt-2 text-xl font-bold text-[#1e2939]">
                                        {numberFormatter.format(record.views)}
                                    </p>
                                </div>
                                <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-[#99a1af]">
                                        <CalendarDays
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Published
                                    </div>
                                    <p className="mt-2 text-xl font-bold text-[#1e2939]">
                                        {record.publishedAt ?? 'Pending'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-[#1e2939]">
                                    <Tags
                                        className="size-4 text-[#1e3a8a]"
                                        aria-hidden="true"
                                    />
                                    SDG Tags
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {record.sdgs.map((sdg) => (
                                        <span
                                            key={sdg}
                                            className="rounded-full bg-[rgba(30,58,138,0.06)] px-2.5 py-1 text-xs font-medium text-[#1e3a8a]"
                                        >
                                            {sdg}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm text-[#4a5565]">
                                <LockKeyhole
                                    className="size-4 text-[#1e3a8a]"
                                    aria-hidden="true"
                                />
                                View-only system record inspection.
                            </div>
                        </div>

                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                            >
                                Close
                            </button>
                        </DialogFooter>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
