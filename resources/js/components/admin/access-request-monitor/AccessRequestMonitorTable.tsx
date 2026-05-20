import { FileSearch } from 'lucide-react';
import type { AccessRequestMonitorRecord } from '@/types/access-request-monitor';
import {
    AccessRequestStatusBadge,
    AgencyBadge,
    formatAccessRequestDateTime,
} from './access-request-monitor-display';
import { AccessRequestActionsMenu } from './AccessRequestActionsMenu';
import { AccessRequestPagination } from './AccessRequestPagination';

type AccessRequestMonitorTableProps = {
    records: AccessRequestMonitorRecord[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalResults: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onView: (record: AccessRequestMonitorRecord) => void;
    onAudit: (record: AccessRequestMonitorRecord) => void;
    onOverrideDeny: (record: AccessRequestMonitorRecord) => void;
};

const tableHeaders = [
    'Requester',
    'Organization',
    'Research Title',
    'Agency',
    'Request Date',
    'Status',
    'Reviewed By',
    'Actions',
];

export function AccessRequestMonitorTable({
    records,
    isLoading,
    currentPage,
    totalPages,
    totalResults,
    rowsPerPage,
    onPageChange,
    onView,
    onAudit,
    onOverrideDeny,
}: AccessRequestMonitorTableProps) {
    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead className="bg-[#f9fafb]/80">
                        <tr className="h-12 text-[12px] leading-4 font-semibold text-[#6a7282]">
                            {tableHeaders.map((header) => (
                                <th
                                    key={header}
                                    scope="col"
                                    className={
                                        header === 'Actions'
                                            ? 'px-6 text-right'
                                            : 'px-6'
                                    }
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: rowsPerPage }, (_, index) => (
                                <tr
                                    key={index}
                                    className="h-[86px] border-b border-[#f9fafb]"
                                >
                                    {tableHeaders.map((header) => (
                                        <td key={header} className="px-6">
                                            <div className="h-3.5 rounded bg-[#f3f4f6]" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={tableHeaders.length}>
                                    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
                                        <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                                            <FileSearch
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <p className="mt-4 text-sm font-semibold text-[#1e2939]">
                                            No access requests found
                                        </p>
                                        <p className="mt-1 max-w-md text-sm text-[#6a7282]">
                                            Adjust search terms or filters to
                                            review access request activity
                                            across agencies.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            records.map((record) => (
                                <tr
                                    key={record.id}
                                    className="h-[86px] border-b border-[#f9fafb] last:border-b-0"
                                >
                                    <td className="w-[210px] px-6">
                                        <button
                                            type="button"
                                            onClick={() => onView(record)}
                                            className="block max-w-[185px] text-left text-sm leading-5 font-semibold text-[#1e2939] transition hover:text-[#1e3a8a]"
                                        >
                                            {record.requesterName}
                                        </button>
                                        <p className="mt-0.5 truncate text-xs leading-4 text-[#99a1af]">
                                            {record.requesterEmail}
                                        </p>
                                    </td>
                                    <td className="max-w-[190px] px-6 text-xs leading-4 text-[#4a5565]">
                                        <span className="line-clamp-2">
                                            {record.organization}
                                        </span>
                                    </td>
                                    <td className="max-w-[260px] px-6">
                                        <button
                                            type="button"
                                            onClick={() => onView(record)}
                                            className="line-clamp-2 text-left text-sm leading-5 font-medium text-[#1e3a8a] transition hover:text-[#172554] hover:underline"
                                        >
                                            {record.researchTitle}
                                        </button>
                                    </td>
                                    <td className="px-6">
                                        <AgencyBadge
                                            agency={record.agencyShortName}
                                        />
                                    </td>
                                    <td className="w-[128px] px-6 text-xs leading-5 text-[#99a1af]">
                                        {formatAccessRequestDateTime(
                                            record.requestDate,
                                        )}
                                    </td>
                                    <td className="px-6">
                                        <AccessRequestStatusBadge
                                            status={record.status}
                                        />
                                    </td>
                                    <td className="max-w-[140px] px-6 text-xs leading-5 text-[#6a7282]">
                                        <span className="line-clamp-2">
                                            {record.reviewedBy ?? '-'}
                                        </span>
                                    </td>
                                    <td className="px-6">
                                        <AccessRequestActionsMenu
                                            record={record}
                                            onView={onView}
                                            onAudit={onAudit}
                                            onOverrideDeny={onOverrideDeny}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AccessRequestPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                rowsPerPage={rowsPerPage}
                onPageChange={onPageChange}
            />
        </>
    );
}
