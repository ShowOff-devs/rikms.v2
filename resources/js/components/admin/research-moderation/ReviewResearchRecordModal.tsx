import {
    Archive,
    CheckCircle2,
    Flag,
    Loader2,
    Send,
    SearchCheck,
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
    moderationStatusLabels,
    moderatorSelectableIssueTypes,
} from '@/data/research-moderation-options';
import { getAllowedResearchModerationActions } from '@/lib/admin/research-moderation-actions';
import type {
    FlaggedResearchRecord,
    ModerationIssueType,
} from '@/types/research-moderation';

type ReviewAction =
    | 'approved'
    | 'published'
    | 'approved-published'
    | 'flagged'
    | 'returned'
    | 'archived';

type ReviewResearchRecordModalProps = {
    record: FlaggedResearchRecord | null;
    open: boolean;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (
        action: ReviewAction,
        note: string,
        issueType?: ModerationIssueType,
    ) => Promise<void>;
};

export function ReviewResearchRecordModal({
    record,
    open,
    isSaving,
    onOpenChange,
    onSave,
}: ReviewResearchRecordModalProps) {
    const [note, setNote] = useState('');
    const [issueType, setIssueType] = useState<ModerationIssueType | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);

    if (!record) {
        return null;
    }

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setNote('');
            setIssueType(null);
            setError(null);
        }

        onOpenChange(nextOpen);
    };

    const handleSave = async (action: ReviewAction) => {
        const trimmedNote = note.trim();
        const minimumRationaleLength =
            action === 'flagged' &&
            (effectiveIssueType === 'policy_noncompliance' ||
                effectiveIssueType === 'incomplete_metadata')
                ? 20
                : 10;

        if (
            (action === 'archived' || action === 'flagged') &&
            trimmedNote.length < minimumRationaleLength
        ) {
            setError(
                action === 'flagged' &&
                    effectiveIssueType === 'policy_noncompliance'
                    ? 'Identify the applicable policy provision or provide a specific policy noncompliance explanation.'
                    : action === 'flagged' &&
                        effectiveIssueType === 'incomplete_metadata'
                      ? 'List the missing or invalid metadata fields in the revision instructions.'
                      : `${action === 'archived' ? 'Archive rationale' : 'Revision instructions'} must be at least 10 characters.`,
            );

            return;
        }

        setError(null);

        await onSave(
            action,
            trimmedNote,
            action === 'flagged' ? effectiveIssueType : undefined,
        );
    };

    const allowedActions = getAllowedResearchModerationActions(record);
    const effectiveIssueType =
        issueType ??
        (moderatorSelectableIssueTypes.includes(record.issueType)
            ? record.issueType
            : 'other_manual_review');

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[760px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <SearchCheck
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Review Research Record
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Add moderation notes and select the appropriate
                        governance action.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                        <section className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                            <p className="text-base leading-6 font-bold text-[#1e2939]">
                                {record.title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#4a5565]">
                                {record.issueDescription}
                            </p>
                            <div className="mt-4 rounded-[10px] border border-[#ffedd4] bg-white p-3">
                                <p className="text-xs font-semibold text-[#9f2d00]">
                                    Recommended action
                                </p>
                                <p className="mt-1 text-sm leading-5 text-[#4a5565]">
                                    {record.recommendedAction}
                                </p>
                            </div>
                        </section>

                        <dl className="grid gap-3 rounded-[12px] border border-[#e5e7eb] bg-white p-4 text-sm">
                            <div>
                                <dt className="text-xs font-semibold text-[#99a1af]">
                                    Agency
                                </dt>
                                <dd className="mt-1 font-medium text-[#1e2939]">
                                    {record.agency}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-[#99a1af]">
                                    Uploaded By
                                </dt>
                                <dd className="mt-1 font-medium text-[#1e2939]">
                                    {record.uploadedBy}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-[#99a1af]">
                                    Concern Type
                                </dt>
                                <dd className="mt-1 font-medium text-[#1e2939]">
                                    {
                                        moderationIssueTypeLabels[
                                            record.issueType
                                        ]
                                    }
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-[#99a1af]">
                                    Status
                                </dt>
                                <dd className="mt-1 font-medium text-[#1e2939]">
                                    {moderationStatusLabels[record.status]}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="mt-4">
                        <label
                            htmlFor="review-issue-type"
                            className="text-sm font-semibold text-[#1e2939]"
                        >
                            Reason if flagged for review
                        </label>
                        <select
                            id="review-issue-type"
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

                    <div className="mt-4">
                        <label
                            htmlFor="moderation-note"
                            className="text-sm font-semibold text-[#1e2939]"
                        >
                            Moderation Notes
                        </label>
                        <textarea
                            id="moderation-note"
                            value={note}
                            onChange={(event) => {
                                setNote(event.target.value);
                                setError(null);
                            }}
                            className="mt-2 min-h-28 w-full resize-y rounded-[12px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm leading-6 text-[#1e2939] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Document the decision and give the agency specific, actionable revision instructions."
                        />
                        {error ? (
                            <p className="mt-2 text-xs text-[#dc2626]">
                                {error}
                            </p>
                        ) : null}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <div className="flex flex-wrap justify-end gap-2">
                        {allowedActions.has('approve') ? (
                            <button
                                type="button"
                                onClick={() => handleSave('approved')}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#008236] px-4 text-sm font-semibold text-white transition hover:bg-[#016630] disabled:cursor-wait disabled:opacity-70"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="size-4" />
                                )}
                                Approve Research
                            </button>
                        ) : null}
                        {allowedActions.has('approve_and_publish') ? (
                            <button
                                type="button"
                                onClick={() => handleSave('approved-published')}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172554] disabled:cursor-wait disabled:opacity-70"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Send
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                )}
                                Approve & Publish
                            </button>
                        ) : null}
                        {allowedActions.has('publish') ? (
                            <button
                                type="button"
                                onClick={() => handleSave('published')}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172554] disabled:cursor-wait disabled:opacity-70"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Send
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                )}
                                Publish Research
                            </button>
                        ) : null}
                        {allowedActions.has('flag_for_review') ? (
                            <button
                                type="button"
                                onClick={() => handleSave('flagged')}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#ffd6a8] bg-[#fff7ed] px-4 text-sm font-semibold text-[#ca3500] transition hover:bg-[#ffedd4] disabled:cursor-wait disabled:opacity-70"
                            >
                                <Flag className="size-4" aria-hidden="true" />
                                Flag for Review
                            </button>
                        ) : null}
                        {allowedActions.has('keep_flagged') ? (
                            <p className="self-center text-sm font-medium text-[#ca3500]">
                                Record remains flagged for review.
                            </p>
                        ) : null}
                        {allowedActions.has('return_to_draft') ? (
                            <button
                                type="button"
                                onClick={() => handleSave('returned')}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#dbeafe] bg-[#eff6ff] px-4 text-sm font-semibold text-[#1e3a8a] transition hover:bg-[#dbeafe] disabled:cursor-wait disabled:opacity-70"
                            >
                                <Undo2 className="size-4" aria-hidden="true" />
                                Return to Draft
                            </button>
                        ) : null}
                        {allowedActions.has('archive') ? (
                            <button
                                type="button"
                                onClick={() => handleSave('archived')}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-wait disabled:opacity-70"
                            >
                                <Archive
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Archive Research
                            </button>
                        ) : null}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
