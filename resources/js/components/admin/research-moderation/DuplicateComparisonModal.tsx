import { GitCompareArrows } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { DuplicateResearchMatch } from '@/types/research-moderation';

type DuplicateComparisonModalProps = {
    match: DuplicateResearchMatch | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFlagForReview: (match: DuplicateResearchMatch) => void;
    onMarkNotDuplicate: (match: DuplicateResearchMatch) => void;
};

function ComparisonCard({
    label,
    title,
    agency,
    authors,
    year,
    abstract,
}: {
    label: string;
    title: string;
    agency: string;
    authors?: string[];
    year?: number;
    abstract?: string;
}) {
    return (
        <article className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-[11px] font-semibold tracking-wide text-[#99a1af] uppercase">
                {label}
            </p>
            <h3 className="mt-2 text-sm leading-5 font-bold text-[#1e2939]">
                {title}
            </h3>
            <dl className="mt-4 grid gap-3 text-xs text-[#4a5565]">
                <div className="flex justify-between gap-3">
                    <dt>Agency</dt>
                    <dd className="font-semibold text-[#1e2939]">{agency}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt>Authors</dt>
                    <dd className="text-right font-semibold text-[#1e2939]">
                        {authors?.join(', ') ?? 'Not provided'}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt>Year</dt>
                    <dd className="font-semibold text-[#1e2939]">
                        {year ?? 'Not provided'}
                    </dd>
                </div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-[#4a5565]">
                {abstract ?? 'No abstract summary is available.'}
            </p>
        </article>
    );
}

export function DuplicateComparisonModal({
    match,
    open,
    onOpenChange,
    onFlagForReview,
    onMarkNotDuplicate,
}: DuplicateComparisonModalProps) {
    if (!match) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[880px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <GitCompareArrows
                            className="size-5 text-[#ca3500]"
                            aria-hidden="true"
                        />
                        Duplicate Research Comparison
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Compare duplicate indicators before escalating or
                        dismissing the match.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <div className="rounded-[12px] border border-[#ffd6a8] bg-[#fff7ed] p-4 text-sm text-[#9f2d00]">
                        <span className="font-semibold">
                            {match.similarityScore}% similarity
                        </span>
                        {match.matchReason ? ` - ${match.matchReason}` : ''}
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <ComparisonCard
                            label="Original Research"
                            title={match.originalTitle}
                            agency={match.originalAgency}
                            authors={match.originalAuthors}
                            year={match.originalYear}
                            abstract={match.originalAbstract}
                        />
                        <ComparisonCard
                            label="Matching Research"
                            title={match.matchingTitle}
                            agency={match.matchingAgency}
                            authors={match.matchingAuthors}
                            year={match.matchingYear}
                            abstract={match.matchingAbstract}
                        />
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
                        onClick={() => onMarkNotDuplicate(match)}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Mark Not Duplicate
                    </button>
                    <button
                        type="button"
                        onClick={() => onFlagForReview(match)}
                        className="h-10 rounded-[10px] bg-[#ca3500] px-4 text-sm font-semibold text-white transition hover:bg-[#9f2d00]"
                    >
                        Flag for Review
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
