import { Link } from '@inertiajs/react';
import { AlertTriangle, CalendarDays, Edit3, UserRound } from 'lucide-react';
import {
    moderationIssueTypeLabels,
    normalizeModerationIssueType,
} from '@/data/research-moderation-options';
import type { RepositoryItem } from '@/types/repository';

function formatRequestDate(value?: string) {
    if (!value) {
        return 'Date unavailable';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Date unavailable';
    }

    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export function RevisionRequestPanel({
    item,
    showEditAction = false,
}: {
    item: RepositoryItem;
    showEditAction?: boolean;
}) {
    if (item.status !== 'revision-required') {
        return null;
    }

    const concernType = normalizeModerationIssueType(
        item.moderationConcernType,
    );

    return (
        <section className="rounded-[14px] border border-[#fdba74] bg-[#fff7ed] p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[#9a3412]">
                        <AlertTriangle className="size-5 shrink-0" />
                        <h2 className="text-base font-bold">
                            Revision Requested
                        </h2>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#c2410c]">
                        Concern Type: {moderationIssueTypeLabels[concernType]}
                    </p>
                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#7c2d12]">
                        {item.moderationNote ||
                            'Review the record and address the moderator’s requested changes before resubmitting.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9a3412]">
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />
                            {formatRequestDate(item.moderationRequestedAt)}
                        </span>
                        {item.moderationReviewerName ? (
                            <span className="inline-flex items-center gap-1.5">
                                <UserRound className="size-3.5" />
                                Requested by {item.moderationReviewerName}
                            </span>
                        ) : null}
                    </div>
                </div>
                {showEditAction && item.capabilities.canUpdate ? (
                    <Link
                        href={`/agency/research/${item.id}`}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#c2410c] px-4 text-sm font-semibold text-white hover:bg-[#9a3412]"
                    >
                        <Edit3 className="size-4" />
                        Edit and Resubmit
                    </Link>
                ) : null}
            </div>
        </section>
    );
}
