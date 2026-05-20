import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AccessRequest } from '@/types/access-request';

type AccessRequestDecision = 'approved' | 'denied';

type AccessRequestDecisionDialogProps = {
    request: AccessRequest | null;
    decision: AccessRequestDecision | null;
    open: boolean;
    denialReason: string;
    isLoading: boolean;
    onDenialReasonChange: (reason: string) => void;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

const decisionCopy = {
    approved: {
        title: 'Approve Access Request',
        description:
            'This will grant the requester download access to the selected research record.',
        confirmLabel: 'Approve Request',
        buttonClassName: 'bg-[#1e3a8a] text-white',
    },
    denied: {
        title: 'Deny Access Request',
        description:
            'Provide a short reason for the denial before recording the decision.',
        confirmLabel: 'Deny Request',
        buttonClassName: 'bg-[#e7000b] text-white',
    },
};

export function AccessRequestDecisionDialog({
    request,
    decision,
    open,
    denialReason,
    isLoading,
    onDenialReasonChange,
    onOpenChange,
    onConfirm,
}: AccessRequestDecisionDialogProps) {
    if (!request || !decision) {
        return null;
    }

    const copy = decisionCopy[decision];
    const denyReasonMissing =
        decision === 'denied' && denialReason.trim().length === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb]">
                <DialogHeader>
                    <DialogTitle className="text-[#1e3a8a]">
                        {copy.title}
                    </DialogTitle>
                    <DialogDescription>{copy.description}</DialogDescription>
                </DialogHeader>

                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <p className="text-sm font-semibold text-[#1e2939]">
                        {request.requesterName}
                    </p>
                    <p className="mt-1 text-sm text-[#6a7282]">
                        {request.researchTitle}
                    </p>
                </div>

                {decision === 'denied' ? (
                    <label className="block">
                        <span className="text-sm font-medium text-[#1e2939]">
                            Denial reason
                        </span>
                        <textarea
                            value={denialReason}
                            onChange={(event) =>
                                onDenialReasonChange(event.target.value)
                            }
                            className="mt-2 min-h-[96px] w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm leading-6 text-[#1e2939] outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Add reason for audit trail..."
                        />
                    </label>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="h-9 rounded-[8px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading || denyReasonMissing}
                        className={`h-9 rounded-[8px] px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${copy.buttonClassName}`}
                    >
                        {isLoading ? 'Saving...' : copy.confirmLabel}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
