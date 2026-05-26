import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import type { ModerationItem } from '@/types/admin-dashboard';

const issueStyles = {
    'duplicate-research': 'bg-[#fef3c7] text-[#bb4d00]',
    'missing-metadata': 'bg-[#dbeafe] text-[#1447e6]',
    'pending-access': 'bg-[#fef3c7] text-[#bb4d00]',
    'incomplete-affiliation': 'bg-[#dbeafe] text-[#1447e6]',
};

export function PendingModerationPanel({
    items,
    isLoading,
    onViewDetails,
}: {
    items: ModerationItem[];
    isLoading: boolean;
    onViewDetails: (item: ModerationItem) => void;
}) {
    return (
        <article className="rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[65px] items-center justify-between gap-4 border-b border-[#f3f4f6] px-6">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#fef3c7] text-[#f59e0b]">
                        <AlertTriangle className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        Pending Moderation
                    </h2>
                </div>
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#fef3c7] text-[11px] font-semibold text-[#bb4d00]">
                    {items.length}
                </span>
            </div>

            <div className="divide-y divide-[#f1f5f9]">
                {isLoading ? (
                    Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="px-6 py-4">
                            <div className="h-4 w-4/5 animate-pulse rounded bg-[#e2e8f0]" />
                            <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-[#e2e8f0]" />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-[#64748b]">
                        No moderation items need attention.
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="px-6 py-3.5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-xs leading-5 font-semibold text-[#0f172a]">
                                        {item.title}
                                    </h3>
                                    <p className="text-[11px] leading-4 text-[#6a7282]">
                                        {item.agency}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-[11px] leading-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.visit(
                                                    '/admin/research-moderation',
                                                )
                                            }
                                            className="font-medium text-[#1e3a8a]"
                                        >
                                            Review
                                        </button>
                                        <span className="text-[#d1d5dc]">
                                            |
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onViewDetails(item)}
                                            className="font-medium text-[#6a7282]"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium ${issueStyles[item.issueType]}`}
                                >
                                    {item.statusLabel}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </article>
    );
}
