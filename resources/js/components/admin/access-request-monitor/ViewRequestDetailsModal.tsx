import { Eye } from 'lucide-react';
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
    formatAccessRequestDateTime,
} from './access-request-monitor-display';

type ViewRequestDetailsModalProps = {
    record: AccessRequestMonitorRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

export function ViewRequestDetailsModal({
    record,
    open,
    onOpenChange,
}: ViewRequestDetailsModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[760px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <Eye
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Access Request Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        View-only access request context for Super Admin
                        oversight.
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
                                    {record.requesterName} -{' '}
                                    {record.requesterEmail}
                                </p>
                            </div>
                            <AccessRequestStatusBadge status={record.status} />
                        </div>

                        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailRow
                                label="Requester"
                                value={record.requesterName}
                            />
                            <DetailRow
                                label="Requester Email"
                                value={record.requesterEmail}
                            />
                            <DetailRow
                                label="Organization"
                                value={record.organization}
                            />
                            <DetailRow
                                label="Agency"
                                value={record.agencyName}
                            />
                            <DetailRow
                                label="Request Date"
                                value={formatAccessRequestDateTime(
                                    record.requestDate,
                                )}
                            />
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
                                label="Requested Access"
                                value={record.requestedAccessType}
                            />
                            <DetailRow
                                label="Access Policy"
                                value={record.researchAccessPolicy}
                            />
                        </dl>
                    </section>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <section className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                            <h3 className="text-sm font-semibold text-[#1e2939]">
                                Request Message
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#4a5565]">
                                {record.requestMessage ??
                                    'No request message was provided.'}
                            </p>
                        </section>

                        <section className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
                            <h3 className="text-sm font-semibold text-[#1e2939]">
                                Decision Context
                            </h3>
                            <dl className="mt-3 grid gap-3">
                                <DetailRow
                                    label="Decision Reason"
                                    value={record.decisionReason}
                                />
                                <DetailRow
                                    label="Reviewer Notes"
                                    value={record.reviewerNotes}
                                />
                                <div>
                                    <dt className="text-[11px] leading-4 font-semibold tracking-wide text-[#99a1af] uppercase">
                                        Agency Badge
                                    </dt>
                                    <dd className="mt-1">
                                        <AgencyBadge
                                            agency={record.agencyShortName}
                                        />
                                    </dd>
                                </div>
                            </dl>
                        </section>
                    </div>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
