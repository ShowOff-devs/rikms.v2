import { SearchCheck } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    moderationIssueTypeLabels,
    moderationStatusLabels,
} from '@/data/mock-research-moderation';
import type { FlaggedResearchRecord } from '@/types/research-moderation';

type ResearchModerationDetailsModalProps = {
    record: FlaggedResearchRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onReview: (record: FlaggedResearchRecord) => void;
};

function DetailRow({
    label,
    value,
}: {
    label: string;
    value?: string | number;
}) {
    return (
        <div>
            <dt className="text-[11px] leading-4 font-semibold tracking-wide text-[#99a1af] uppercase">
                {label}
            </dt>
            <dd className="mt-1 text-sm leading-5 font-medium text-[#1e2939]">
                {value ?? 'Not provided'}
            </dd>
        </div>
    );
}

export function ResearchModerationDetailsModal({
    record,
    open,
    onOpenChange,
    onReview,
}: ResearchModerationDetailsModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <SearchCheck
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Research Moderation Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        View-only moderation context for the selected flagged
                        research record.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <div className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                        <p className="text-base leading-6 font-bold text-[#1e2939]">
                            {record.title}
                        </p>
                        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailRow label="Agency" value={record.agency} />
                            <DetailRow
                                label="Uploaded By"
                                value={record.uploadedBy}
                            />
                            <DetailRow label="Year" value={record.year} />
                            <DetailRow
                                label="Issue Type"
                                value={
                                    moderationIssueTypeLabels[record.issueType]
                                }
                            />
                            <DetailRow
                                label="Status"
                                value={moderationStatusLabels[record.status]}
                            />
                            <DetailRow
                                label="Date Flagged"
                                value={record.dateFlagged}
                            />
                        </dl>
                    </div>

                    <div className="mt-4 grid gap-4">
                        <section className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                            <h3 className="text-sm font-semibold text-[#1e2939]">
                                Abstract / Metadata Summary
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#4a5565]">
                                {record.abstract ??
                                    'No abstract was provided with this flagged record.'}
                            </p>
                        </section>

                        <section className="rounded-[12px] border border-[#ffd6a8] bg-[#fff7ed] p-4">
                            <h3 className="text-sm font-semibold text-[#9f2d00]">
                                Detected Issue Explanation
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#9f2d00]">
                                {record.issueDescription ??
                                    'The record requires manual moderation review.'}
                            </p>
                        </section>

                        <section className="rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] p-4">
                            <h3 className="text-sm font-semibold text-[#1d4ed8]">
                                Recommended Action
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#1d4ed8]">
                                {record.recommendedAction ??
                                    'Review the research metadata and determine the appropriate moderation outcome.'}
                            </p>
                        </section>
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
                    <button
                        type="button"
                        onClick={() => onReview(record)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172554]"
                    >
                        <SearchCheck className="size-4" aria-hidden="true" />
                        Review Record
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
