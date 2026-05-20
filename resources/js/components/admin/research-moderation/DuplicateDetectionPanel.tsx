import { Eye, Flag, GitCompareArrows, ShieldAlert } from 'lucide-react';
import type { DuplicateResearchMatch } from '@/types/research-moderation';

type DuplicateDetectionPanelProps = {
    matches: DuplicateResearchMatch[];
    isLoading: boolean;
    onViewComparison: (match: DuplicateResearchMatch) => void;
    onFlagForReview: (match: DuplicateResearchMatch) => void;
};

export function DuplicateDetectionPanel({
    matches,
    isLoading,
    onViewComparison,
    onFlagForReview,
}: DuplicateDetectionPanelProps) {
    const visibleMatch = matches[0];

    return (
        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 border-b border-[#f3f4f6] px-6 py-4">
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#fff7ed] text-[#f54900]">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                </span>
                <div>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        Duplicate Research Detection
                    </h2>
                    <p className="text-xs leading-4 text-[#99a1af]">
                        Potential duplicates requiring manual verification.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="p-6">
                    <div className="h-24 rounded-[12px] bg-[#f3f4f6]" />
                </div>
            ) : !visibleMatch ? (
                <div className="px-6 py-8 text-sm text-[#6a7282]">
                    No duplicate matches are currently queued for review.
                </div>
            ) : (
                <div className="grid gap-4 p-6 xl:grid-cols-[1fr_auto] xl:items-end">
                    <div className="min-w-0">
                        <span className="inline-flex h-[23px] items-center rounded-full border border-[#ffd6a8] bg-[#fff7ed] px-2 text-[11px] font-semibold text-[#f54900]">
                            Possible duplicate detected
                        </span>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <article className="rounded-[10px] border border-[#f3f4f6] bg-[#f9fafb] p-4">
                                <p className="text-[10px] leading-4 font-semibold tracking-wide text-[#99a1af] uppercase">
                                    Original
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm leading-5 font-semibold text-[#364153]">
                                    {visibleMatch.originalTitle}
                                </p>
                                <p className="mt-1 text-xs text-[#99a1af]">
                                    Agency: {visibleMatch.originalAgency}
                                </p>
                            </article>
                            <article className="rounded-[10px] border border-[#ffedd4] bg-[#fff7ed]/50 p-4">
                                <p className="text-[10px] leading-4 font-semibold tracking-wide text-[#ff6900] uppercase">
                                    Matching Record
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm leading-5 font-semibold text-[#364153]">
                                    {visibleMatch.matchingTitle}
                                </p>
                                <p className="mt-1 text-xs text-[#99a1af]">
                                    Agency: {visibleMatch.matchingAgency}
                                </p>
                            </article>
                        </div>
                        <p className="mt-3 text-xs text-[#6a7282]">
                            Similarity score:{' '}
                            <span className="font-semibold text-[#ca3500]">
                                {visibleMatch.similarityScore}%
                            </span>
                            {visibleMatch.matchReason
                                ? ` - ${visibleMatch.matchReason}`
                                : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                            type="button"
                            onClick={() => onViewComparison(visibleMatch)}
                            className="inline-flex h-[34px] items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                        >
                            <Eye className="size-3.5" aria-hidden="true" />
                            View Comparison
                        </button>
                        <button
                            type="button"
                            onClick={() => onFlagForReview(visibleMatch)}
                            className="inline-flex h-[34px] items-center justify-center gap-2 rounded-[10px] border border-[#ffd6a8] bg-[#fff7ed] px-4 text-xs font-medium text-[#ca3500] transition hover:bg-[#ffedd4]"
                        >
                            <Flag className="size-3.5" aria-hidden="true" />
                            Flag for Review
                        </button>
                    </div>
                </div>
            )}

            {matches.length > 1 ? (
                <div className="flex items-center gap-2 border-t border-[#f9fafb] px-6 py-3 text-xs text-[#6a7282]">
                    <GitCompareArrows className="size-3.5" aria-hidden="true" />
                    {matches.length - 1} additional duplicate alert
                    {matches.length - 1 === 1 ? '' : 's'} queued.
                </div>
            ) : null}
        </section>
    );
}
