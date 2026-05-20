import { CalendarDays, FileText, Mail, UserRound } from 'lucide-react';
import { AccessRequestStatusBadge } from '@/components/access-requests/AccessRequestStatusBadge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AccessRequest } from '@/types/access-request';

type AccessRequestDetailsModalProps = {
    request: AccessRequest | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApprove: (request: AccessRequest) => void;
    onDeny: (request: AccessRequest) => void;
};

export function AccessRequestDetailsModal({
    request,
    open,
    onOpenChange,
    onApprove,
    onDeny,
}: AccessRequestDetailsModalProps) {
    if (!request) {
        return null;
    }

    const isPending = request.status === 'pending';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[680px] rounded-[14px] border-[#e5e7eb] p-0">
                <DialogHeader className="border-b border-[#f3f4f6] px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <DialogTitle className="text-[20px] leading-7 font-bold text-[#1e3a8a]">
                                Access Request Details
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-[#6a7282]">
                                Review requester, document, and decision
                                information.
                            </DialogDescription>
                        </div>
                        <AccessRequestStatusBadge status={request.status} />
                    </div>
                </DialogHeader>

                <div className="space-y-5 px-6 py-5">
                    <section>
                        <h3 className="text-sm font-semibold text-[#1e2939]">
                            Requester
                        </h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <DetailItem
                                icon={UserRound}
                                label="Name"
                                value={request.requesterName}
                            />
                            <DetailItem
                                icon={Mail}
                                label="Email"
                                value={request.requesterEmail}
                            />
                            <DetailItem
                                icon={FileText}
                                label="Organization"
                                value={request.organization}
                            />
                            <DetailItem
                                icon={CalendarDays}
                                label="Request Date"
                                value={request.requestDate}
                            />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-[#1e2939]">
                            Requested Research
                        </h3>
                        <div className="mt-3 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                            <p className="text-sm font-semibold text-[#1e3a8a]">
                                {request.researchTitle}
                            </p>
                            <p className="mt-1 text-xs text-[#6a7282]">
                                Research ID: {request.researchId}
                            </p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-[#1e2939]">
                            Request Message
                        </h3>
                        <p className="mt-2 rounded-[10px] border border-[#e5e7eb] bg-white p-4 text-sm leading-6 text-[#4a5565]">
                            {request.requestMessage ??
                                'No message was included with this request.'}
                        </p>
                    </section>

                    {request.status !== 'pending' ? (
                        <section className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm text-[#4a5565]">
                            <p>
                                Processed by{' '}
                                <span className="font-semibold text-[#1e2939]">
                                    {request.processedBy ?? 'Agency Admin'}
                                </span>
                                {request.processedAt
                                    ? ` on ${request.processedAt}`
                                    : ''}
                                .
                            </p>
                            {request.denialReason ? (
                                <p className="mt-2">
                                    Denial reason: {request.denialReason}
                                </p>
                            ) : null}
                        </section>
                    ) : null}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#f3f4f6] px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-9 rounded-[8px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb]"
                    >
                        Close
                    </button>
                    {isPending ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onDeny(request)}
                                className="h-9 rounded-[8px] border border-[#ffc9c9] bg-[#fef2f2] px-4 text-sm font-medium text-[#e7000b]"
                            >
                                Deny
                            </button>
                            <button
                                type="button"
                                onClick={() => onApprove(request)}
                                className="h-9 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
                            >
                                Approve
                            </button>
                        </>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DetailItem({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof UserRound;
    label: string;
    value: string;
}) {
    return (
        <div className="flex gap-3 rounded-[10px] border border-[#e5e7eb] bg-white p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#eff6ff] text-[#1e3a8a]">
                <Icon className="size-4" />
            </span>
            <span className="min-w-0">
                <span className="block text-xs leading-4 text-[#6a7282]">
                    {label}
                </span>
                <span className="mt-0.5 block truncate text-sm font-medium text-[#1e2939]">
                    {value}
                </span>
            </span>
        </div>
    );
}
