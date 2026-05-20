import { ClipboardCheck, Loader2 } from 'lucide-react';
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
    formatAccessRequestDateTime,
} from './access-request-monitor-display';

type AuditDecisionModalProps = {
    record: AccessRequestMonitorRecord | null;
    open: boolean;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onMarkReviewed: (record: AccessRequestMonitorRecord) => Promise<void>;
};

function DetailRow({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <dt className="text-[11px] leading-4 font-semibold tracking-wide text-[#99a1af] uppercase">
                {label}
            </dt>
            <dd className="mt-1 text-sm leading-5 font-medium text-[#1e2939]">
                {value || 'Not provided'}
            </dd>
        </div>
    );
}

export function AuditDecisionModal({
    record,
    open,
    isSaving,
    onOpenChange,
    onMarkReviewed,
}: AuditDecisionModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[780px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <ClipboardCheck
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Audit Access Decision
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Review the agency decision trail and supporting policy
                        context.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <section className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-base leading-6 font-bold text-[#1e2939]">
                                    {record.researchTitle}
                                </p>
                                <p className="mt-1 text-sm text-[#6a7282]">
                                    {record.agencyShortName} decision for{' '}
                                    {record.requesterName}
                                </p>
                            </div>
                            <AccessRequestStatusBadge status={record.status} />
                        </div>

                        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailRow
                                label="Reviewed By"
                                value={record.reviewedBy ?? '-'}
                            />
                            <DetailRow
                                label="Reviewed Date"
                                value={
                                    record.reviewedAt
                                        ? formatAccessRequestDateTime(
                                              record.reviewedAt,
                                          )
                                        : '-'
                                }
                            />
                            <DetailRow
                                label="Agency Reviewer"
                                value={record.reviewedBy ?? '-'}
                            />
                            <DetailRow
                                label="Original Request"
                                value={formatAccessRequestDateTime(
                                    record.requestDate,
                                )}
                            />
                            <DetailRow
                                label="Processing Duration"
                                value={record.processingDuration}
                            />
                            <DetailRow
                                label="Audit Status"
                                value={
                                    record.auditStatus === 'reviewed'
                                        ? 'Reviewed'
                                        : 'Unreviewed'
                                }
                            />
                            <DetailRow
                                label="IP / Device"
                                value={[
                                    record.reviewerIpAddress,
                                    record.reviewerDevice,
                                ]
                                    .filter(Boolean)
                                    .join(' - ')}
                            />
                            <DetailRow
                                label="Policy Rule Used"
                                value={record.policyRuleUsed}
                            />
                            <DetailRow
                                label="Decision Reason"
                                value={record.decisionReason}
                            />
                        </dl>
                    </section>

                    <section className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                        <h3 className="text-sm font-semibold text-[#1e2939]">
                            Reviewer Notes
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#4a5565]">
                            {record.reviewerNotes ??
                                'No reviewer notes are recorded yet.'}
                        </p>
                    </section>

                    <section className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                        <h3 className="text-sm font-semibold text-[#1e2939]">
                            Audit Trail
                        </h3>
                        <div className="mt-4 grid gap-3">
                            {(record.auditTrail ?? []).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="rounded-[10px] border border-[#f3f4f6] bg-[#f9fafb] p-3"
                                >
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                        <p className="text-sm font-semibold text-[#1e2939]">
                                            {entry.action}
                                        </p>
                                        <p className="text-xs text-[#99a1af]">
                                            {formatAccessRequestDateTime(
                                                entry.timestamp,
                                            )}
                                        </p>
                                    </div>
                                    <p className="mt-1 text-xs font-medium text-[#6a7282]">
                                        {entry.actor}
                                    </p>
                                    {entry.notes ? (
                                        <p className="mt-2 text-sm leading-5 text-[#4a5565]">
                                            {entry.notes}
                                        </p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => onMarkReviewed(record)}
                        disabled={isSaving || record.auditStatus === 'reviewed'}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172554] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <ClipboardCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                        )}
                        Mark as Reviewed
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
