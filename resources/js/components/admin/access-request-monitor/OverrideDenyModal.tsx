import { Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AccessRequestMonitorRecord } from '@/types/access-request-monitor';
import {
    AccessRequestStatusBadge,
    AgencyBadge,
} from './access-request-monitor-display';

type OverrideDenyModalProps = {
    record: AccessRequestMonitorRecord | null;
    open: boolean;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (
        record: AccessRequestMonitorRecord,
        reason: string,
    ) => Promise<void>;
};

export function OverrideDenyModal({
    record,
    open,
    isSaving,
    onOpenChange,
    onConfirm,
}: OverrideDenyModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!record) {
        return null;
    }

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setReason('');
            setError(null);
        }

        onOpenChange(nextOpen);
    };

    const handleConfirm = async () => {
        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setError('Override reason is required.');

            return;
        }

        if (record.status !== 'approved') {
            setError('Only approved requests can be overridden.');

            return;
        }

        setError(null);
        await onConfirm(record, trimmedReason);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[14px] border-[#fecaca] bg-white sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <ShieldAlert
                            className="size-5 text-[#c10007]"
                            aria-hidden="true"
                        />
                        Override Access Decision?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This will override the current access decision and mark
                        the request as denied. This action should only be used
                        for policy, compliance, or security reasons.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-4">
                    <p className="text-sm font-semibold text-[#991b1b]">
                        Selected Request
                    </p>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-semibold text-[#991b1b]/70">
                                Requester
                            </dt>
                            <dd className="mt-1 font-medium text-[#1e2939]">
                                {record.requesterName}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-[#991b1b]/70">
                                Agency
                            </dt>
                            <dd className="mt-1">
                                <AgencyBadge agency={record.agencyShortName} />
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold text-[#991b1b]/70">
                                Research Title
                            </dt>
                            <dd className="mt-1 font-medium text-[#1e2939]">
                                {record.researchTitle}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-[#991b1b]/70">
                                Current Status
                            </dt>
                            <dd className="mt-1">
                                <AccessRequestStatusBadge
                                    status={record.status}
                                />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-[#991b1b]/70">
                                Reviewed By
                            </dt>
                            <dd className="mt-1 font-medium text-[#1e2939]">
                                {record.reviewedBy ?? '-'}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div>
                    <label
                        htmlFor="override-reason"
                        className="text-sm font-semibold text-[#1e2939]"
                    >
                        Override Reason
                    </label>
                    <textarea
                        id="override-reason"
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setError(null);
                        }}
                        className="mt-2 min-h-28 w-full resize-y rounded-[12px] border border-[#fecaca] bg-white px-3 py-2 text-sm leading-6 text-[#1e2939] transition outline-none placeholder:text-[#99a1af] focus:border-[#c10007]/50 focus:ring-2 focus:ring-[#c10007]/10"
                        placeholder="Document the policy, compliance, or security reason for this override."
                        disabled={isSaving}
                    />
                    {error ? (
                        <p className="mt-2 text-xs text-[#dc2626]">{error}</p>
                    ) : null}
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
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-wait disabled:opacity-70"
                    >
                        {isSaving ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <ShieldAlert
                                className="size-4"
                                aria-hidden="true"
                            />
                        )}
                        Confirm Override
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
