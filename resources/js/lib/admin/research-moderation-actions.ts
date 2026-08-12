import type { FlaggedResearchRecord } from '@/types/research-moderation';

export type ResearchModerationAction =
    | 'approve'
    | 'publish'
    | 'approve_and_publish'
    | 'reject'
    | 'return_to_draft'
    | 'archive'
    | 'flag_for_review'
    | 'keep_flagged'
    | 'view';

type ResearchModerationRecord = Pick<FlaggedResearchRecord, 'officialStatus'>;

const actionsByStatus: Record<string, ResearchModerationAction[]> = {
    submitted: [
        'view',
        'approve',
        'approve_and_publish',
        'reject',
        'flag_for_review',
    ],
    under_review: [
        'view',
        'approve',
        'approve_and_publish',
        'reject',
        'return_to_draft',
        'flag_for_review',
    ],
    approved: ['view', 'publish', 'archive'],
    published: ['view', 'archive'],
    rejected: ['view', 'archive', 'keep_flagged'],
    archived: ['view'],
    superseded: ['view'],
    draft: ['view'],
};

export function normalizeResearchModerationStatus(status?: string): string {
    return status?.trim().toLowerCase().replaceAll('-', '_') ?? '';
}

export function getAllowedResearchModerationActions(
    record: ResearchModerationRecord,
): Set<ResearchModerationAction> {
    const status = normalizeResearchModerationStatus(record.officialStatus);

    return new Set(actionsByStatus[status] ?? ['view']);
}

export function canArchiveResearch(record: ResearchModerationRecord): boolean {
    return getAllowedResearchModerationActions(record).has('archive');
}

export function canFlagForReview(record: ResearchModerationRecord): boolean {
    return getAllowedResearchModerationActions(record).has('flag_for_review');
}

export function canApproveAndPublish(
    record: ResearchModerationRecord,
): boolean {
    return getAllowedResearchModerationActions(record).has(
        'approve_and_publish',
    );
}
