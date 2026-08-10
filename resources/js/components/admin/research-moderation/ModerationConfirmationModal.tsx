import {
    Archive,
    CheckCircle2,
    Flag,
    Loader2,
    Send,
    Undo2,
} from 'lucide-react';
import { useState } from 'react';
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
    moderatorSelectableIssueTypes,
} from '@/data/research-moderation-options';
import type {
    FlaggedResearchRecord,
    ModerationIssueType,
} from '@/types/research-moderation';

export type ModerationConfirmationAction =
    | 'resolve'
    | 'publish'
    | 'flag'
    | 'return_to_draft'
    | 'archive';

const actionCopy: Record<
    ModerationConfirmationAction,
    {
        title: string;
        description: string;
        confirmLabel: string;
        icon: typeof CheckCircle2;
        buttonClass: string;
    }
> = {
    resolve: {
        title: 'Approve Research?',
        description:
            'This will approve the submitted research record and add a moderation activity entry.',
        confirmLabel: 'Approve Research',
        icon: CheckCircle2,
        buttonClass: 'bg-[#008236] text-white hover:bg-[#016630]',
    },
    publish: {
        title: 'Publish Research?',
        description:
            'This will publish the approved research record to the public repository.',
        confirmLabel: 'Publish Research',
        icon: Send,
        buttonClass: 'bg-[#1e3a8a] text-white hover:bg-[#172554]',
    },
    flag: {
        title: 'Request Research Revision?',
        description:
            'This will record the issue and hold the research for agency revision.',
        confirmLabel: 'Request Revision',
        icon: Flag,
        buttonClass: 'bg-[#ca3500] text-white hover:bg-[#9f2d00]',
    },
    return_to_draft: {
        title: 'Return Research to Draft?',
        description:
            'This will return the record to the agency as a draft for further changes.',
        confirmLabel: 'Return to Draft',
        icon: Undo2,
        buttonClass: 'bg-[#1e3a8a] text-white hover:bg-[#172554]',
    },
    archive: {
        title: 'Archive Research Record?',
        description:
            'This will remove the record from the active moderation queue and add an archive activity.',
        confirmLabel: 'Archive Research',
        icon: Archive,
        buttonClass: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
    },
};

export function ModerationConfirmationModal({
    record,
    action,
    open,
    isSaving,
    onOpenChange,
    onConfirm,
}: {
    record: FlaggedResearchRecord | null;
    action: ModerationConfirmationAction | null;
    open: boolean;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (note?: string, issueType?: ModerationIssueType) => void;
}) {
    const [note, setNote] = useState('');
    const [issueType, setIssueType] = useState<ModerationIssueType | null>(
        null,
    );
    const [validationError, setValidationError] = useState<string | null>(null);

    if (!record || !action) {
        return null;
    }

    const copy = actionCopy[action];
    const Icon = copy.icon;
    const requiresRationale = action === 'archive' || action === 'flag';
    const effectiveIssueType =
        issueType ??
        (moderatorSelectableIssueTypes.includes(record.issueType)
            ? record.issueType
            : 'other_manual_review');

    const handleConfirm = () => {
        const trimmedNote = note.trim();
        const minimumRationaleLength =
            action === 'flag' &&
            (effectiveIssueType === 'policy_noncompliance' ||
                effectiveIssueType === 'incomplete_metadata')
                ? 20
                : 10;

        if (requiresRationale && trimmedNote.length < minimumRationaleLength) {
            setValidationError(
                action === 'flag' &&
                    effectiveIssueType === 'policy_noncompliance'
                    ? 'Identify the applicable policy provision or provide a specific policy noncompliance explanation.'
                    : action === 'flag' &&
                        effectiveIssueType === 'incomplete_metadata'
                      ? 'List the missing or invalid metadata fields in the revision instructions.'
                      : `${action === 'archive' ? 'Archive' : 'Review'} rationale must be at least 10 characters.`,
            );

            return;
        }

        setValidationError(null);
        onConfirm(
            trimmedNote || undefined,
            action === 'flag' ? effectiveIssueType : undefined,
        );
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && !isSaving) {
            setNote('');
            setIssueType(null);
            setValidationError(null);
        }

        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <Icon className="size-5 text-[#1e3a8a]" />
                        {copy.title}
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        {copy.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <p className="text-sm font-semibold text-[#1e2939]">
                        {record.title}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#6a7282]">
                        {record.agency} - {record.uploadedBy}
                    </p>
                </div>

                {action === 'flag' ? (
                    <div>
                        <label
                            htmlFor="moderation-issue-type"
                            className="text-sm font-semibold text-[#1e2939]"
                        >
                            Concern Type
                        </label>
                        <select
                            id="moderation-issue-type"
                            value={effectiveIssueType}
                            onChange={(event) =>
                                setIssueType(
                                    event.target.value as ModerationIssueType,
                                )
                            }
                            disabled={isSaving}
                            className="mt-2 h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#1e2939] outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10 disabled:opacity-60"
                        >
                            {moderatorSelectableIssueTypes.map((value) => (
                                <option key={value} value={value}>
                                    {moderationIssueTypeLabels[value]}
                                </option>
                            ))}
                        </select>
                        {effectiveIssueType === 'policy_noncompliance' ? (
                            <p className="mt-1 text-xs leading-5 text-[#b91c1c]">
                                Use only when a documented policy or governance
                                rule has been breached.
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {requiresRationale ? (
                    <div>
                        <label
                            htmlFor="archive-rationale"
                            className="text-sm font-semibold text-[#1e2939]"
                        >
                            {action === 'archive'
                                ? 'Archive rationale'
                                : 'Revision instructions'}
                        </label>
                        <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                            {action === 'archive'
                                ? 'Explain why this research record is being archived.'
                                : 'Explain what must be reviewed or revised by the agency.'}{' '}
                            This rationale will be retained in the moderation
                            audit trail.
                        </p>
                        <textarea
                            id="archive-rationale"
                            value={note}
                            onChange={(event) => {
                                setNote(event.target.value);
                                setValidationError(null);
                            }}
                            disabled={isSaving}
                            className="mt-2 min-h-24 w-full resize-y rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10 disabled:opacity-60"
                        />
                        {validationError ? (
                            <p className="mt-2 text-xs text-[#dc2626]">
                                {validationError}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSaving}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${copy.buttonClass}`}
                    >
                        {isSaving && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {copy.confirmLabel}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
