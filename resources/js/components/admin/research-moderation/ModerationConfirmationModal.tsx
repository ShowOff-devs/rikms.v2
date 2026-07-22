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
import type { FlaggedResearchRecord } from '@/types/research-moderation';

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
        title: 'Flag Record for Review?',
        description:
            'This will move the record into pending review for further moderation.',
        confirmLabel: 'Flag for Review',
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
    onConfirm: (note?: string) => void;
}) {
    const [note, setNote] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    if (!record || !action) {
        return null;
    }

    const copy = actionCopy[action];
    const Icon = copy.icon;
    const requiresRationale = action === 'archive';

    const handleConfirm = () => {
        const trimmedNote = note.trim();

        if (requiresRationale && trimmedNote.length < 10) {
            setValidationError(
                'Archive rationale must be at least 10 characters.',
            );

            return;
        }

        setValidationError(null);
        onConfirm(trimmedNote || undefined);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && !isSaving) {
            setNote('');
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

                {requiresRationale ? (
                    <div>
                        <label
                            htmlFor="archive-rationale"
                            className="text-sm font-semibold text-[#1e2939]"
                        >
                            Archive rationale
                        </label>
                        <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                            Explain why this research record is being archived.
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
