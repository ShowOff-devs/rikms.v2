import { Check, Eye, X } from 'lucide-react';
import type { AccessRequest } from '@/types/access-request';

type AccessRequestActionsProps = {
    request: AccessRequest;
    onView: (request: AccessRequest) => void;
    onApprove: (request: AccessRequest) => void;
    onDeny: (request: AccessRequest) => void;
};

export function AccessRequestActions({
    request,
    onView,
    onApprove,
    onDeny,
}: AccessRequestActionsProps) {
    const isPending = request.status === 'pending';

    return (
        <div className="flex justify-end gap-1">
            <button
                type="button"
                onClick={() => onView(request)}
                className="flex size-7 items-center justify-center rounded-[8px] text-[#6a7282] hover:bg-[#f3f4f6] hover:text-[#1e3a8a]"
                title="View details"
                aria-label={`View details for ${request.requesterName}`}
            >
                <Eye className="size-4" />
            </button>

            {isPending ? (
                <>
                    <button
                        type="button"
                        onClick={() => onApprove(request)}
                        className="flex size-7 items-center justify-center rounded-[8px] text-[#008236] hover:bg-[#f0fdf4]"
                        title="Approve"
                        aria-label={`Approve request from ${request.requesterName}`}
                    >
                        <Check className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDeny(request)}
                        className="flex size-7 items-center justify-center rounded-[8px] text-[#e7000b] hover:bg-[#fef2f2]"
                        title="Deny"
                        aria-label={`Deny request from ${request.requesterName}`}
                    >
                        <X className="size-4" />
                    </button>
                </>
            ) : null}
        </div>
    );
}
