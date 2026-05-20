import { Archive, CheckCircle2, Flag, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { FlaggedResearchRecord } from '@/types/research-moderation';

export type ModerationConfirmationAction = 'resolve' | 'flag' | 'archive';

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
        title: 'Mark Issue as Resolved?',
        description:
            'This will update the record status and add a moderation activity entry.',
        confirmLabel: 'Mark Resolved',
        icon: CheckCircle2,
        buttonClass: 'bg-[#008236] text-white hover:bg-[#016630]',
    },
    flag: {
        title: 'Flag Record for Review?',
        description:
            'This will move the record into pending review for further moderation.',
        confirmLabel: 'Flag for Review',
        icon: Flag,
        buttonClass: 'bg-[#ca3500] text-white hover:bg-[#9f2d00]',
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
    onConfirm: () => void;
}) {
    if (!record || !action) {
        return null;
    }

    const copy = actionCopy[action];
    const Icon = copy.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
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
