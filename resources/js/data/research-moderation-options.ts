import type {
    ModerationIssueType,
    ModerationStatus,
} from '@/types/research-moderation';

export const moderationIssueTypeLabels: Record<ModerationIssueType, string> = {
    incomplete_metadata: 'Incomplete Metadata',
    metadata_inconsistency: 'Metadata Inconsistency',
    document_file_issue: 'Document/File Issue',
    possible_duplicate: 'Possible Duplicate',
    authorship_attribution_concern: 'Authorship/Attribution Concern',
    privacy_restricted_data_concern: 'Privacy/Restricted Data Concern',
    policy_noncompliance: 'Policy Noncompliance',
    other_manual_review: 'Other Manual Review',
};

export const moderatorSelectableIssueTypes: ModerationIssueType[] = [
    'incomplete_metadata',
    'metadata_inconsistency',
    'document_file_issue',
    'possible_duplicate',
    'authorship_attribution_concern',
    'privacy_restricted_data_concern',
    'policy_noncompliance',
    'other_manual_review',
];

export function normalizeModerationIssueType(
    value?: string | null,
): ModerationIssueType {
    const normalized = value?.trim().toLowerCase().replaceAll('-', '_') ?? '';

    if (normalized === 'duplicate_research') {
        return 'possible_duplicate';
    }

    if (
        normalized === 'incomplete_metadata' ||
        normalized === 'missing_abstract' ||
        normalized === 'missing_keywords' ||
        normalized === 'missing_authors'
    ) {
        return 'incomplete_metadata';
    }

    if (normalized === 'policy_violation') {
        return 'policy_noncompliance';
    }

    if (
        normalized === 'revision_required' ||
        normalized === 'routine_review' ||
        normalized === 'other_concern'
    ) {
        return 'other_manual_review';
    }

    return moderatorSelectableIssueTypes.includes(
        normalized as ModerationIssueType,
    )
        ? (normalized as ModerationIssueType)
        : 'other_manual_review';
}

export const moderationStatusLabels: Record<ModerationStatus, string> = {
    'pending-review': 'Pending Review',
    resolved: 'Resolved',
    flagged: 'Flagged',
    'needs-review': 'Needs Review',
};
