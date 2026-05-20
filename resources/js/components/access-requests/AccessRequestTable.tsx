import type { ReactNode } from 'react';
import { AccessRequestActions } from '@/components/access-requests/AccessRequestActions';
import { AccessRequestEmptyState } from '@/components/access-requests/AccessRequestEmptyState';
import { AccessRequestStatusBadge } from '@/components/access-requests/AccessRequestStatusBadge';
import type { AccessRequest } from '@/types/access-request';

type AccessRequestTableProps = {
    requests: AccessRequest[];
    footer: ReactNode;
    onView: (request: AccessRequest) => void;
    onApprove: (request: AccessRequest) => void;
    onDeny: (request: AccessRequest) => void;
};

export function AccessRequestTable({
    requests,
    footer,
    onView,
    onApprove,
    onDeny,
}: AccessRequestTableProps) {
    return (
        <article className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            {requests.length === 0 ? (
                <AccessRequestEmptyState />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] text-left text-sm">
                        <thead className="border-b border-[#f3f4f6] bg-[#f9fafb] text-xs font-medium text-[#6a7282]">
                            <tr>
                                <th className="w-12 px-4 py-4">
                                    <span className="sr-only">Select</span>
                                </th>
                                <th className="w-[160px] px-4 py-4">
                                    Requester Name
                                </th>
                                <th className="w-[180px] px-4 py-4">Email</th>
                                <th className="w-[170px] px-4 py-4">
                                    Organization
                                </th>
                                <th className="w-[270px] px-4 py-4">
                                    Research Title
                                </th>
                                <th className="w-[100px] px-4 py-4">
                                    Request Date
                                </th>
                                <th className="w-[120px] px-4 py-4">Status</th>
                                <th className="w-[96px] px-4 py-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((request) => (
                                <tr
                                    key={request.id}
                                    className="h-[65px] border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="size-4 rounded border-[#d1d5dc] text-[#1e3a8a] focus:ring-[#1e3a8a]"
                                            aria-label={`Select request from ${request.requesterName}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-medium text-[#1e2939]">
                                        <span className="line-clamp-2">
                                            {request.requesterName}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#6a7282]">
                                        <span className="block truncate">
                                            {request.requesterEmail}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#6a7282]">
                                        <span className="block truncate">
                                            {request.organization}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-[#1e3a8a]">
                                        <button
                                            type="button"
                                            onClick={() => onView(request)}
                                            className="block max-w-[250px] truncate text-left hover:underline"
                                        >
                                            {request.researchTitle}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-[#6a7282]">
                                        {request.requestDate}
                                    </td>
                                    <td className="px-4 py-3">
                                        <AccessRequestStatusBadge
                                            status={request.status}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <AccessRequestActions
                                            request={request}
                                            onView={onView}
                                            onApprove={onApprove}
                                            onDeny={onDeny}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {footer}
        </article>
    );
}
