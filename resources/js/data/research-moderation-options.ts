import type {
    ModerationIssueType,
    ModerationStatus,
} from '@/types/research-moderation';

export const moderationIssueTypeLabels: Record<ModerationIssueType, string> = {
    'duplicate-research': 'Duplicate Research',
    'incomplete-metadata': 'Incomplete Metadata',
    'policy-violation': 'Policy Violation',
    'missing-abstract': 'Missing Abstract',
    'missing-keywords': 'Missing Keywords',
    'incomplete-author-affiliation': 'Incomplete Author Affiliation',
};

export const moderationStatusLabels: Record<ModerationStatus, string> = {
    'pending-review': 'Pending Review',
    resolved: 'Resolved',
    flagged: 'Flagged',
    'needs-review': 'Needs Review',
};
