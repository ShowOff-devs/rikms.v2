import { Eye, RefreshCcw, UsersRound } from 'lucide-react';
import type { Role, UserRoleAssignment } from '@/types/rbac';

type UserRoleAssignmentsTabProps = {
    assignments: UserRoleAssignment[];
    roles: Role[];
    onChangeRole: (assignment: UserRoleAssignment) => void;
};

const statusClasses = {
    active: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
    inactive: 'border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565]',
    pending: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
};

export function UserRoleAssignmentsTab({
    assignments,
    roles,
    onChangeRole,
}: UserRoleAssignmentsTabProps) {
    const getRoleName = (roleId: string) =>
        roles.find((role) => role.id === roleId)?.name ?? 'Unassigned';

    if (assignments.length === 0) {
        return (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-[#dcfce7] text-[#16a34a]">
                    <UsersRound className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-[#1e2939]">
                    No assignments found
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-5 text-[#6a7282]">
                    Search for a user or role to review assignment records.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
                <thead>
                    <tr className="h-10 border-b border-[#f3f4f6] bg-[#f9fafb] text-left">
                        <th className="w-[24%] px-6 text-[11px] font-semibold text-[#6a7282]">
                            User
                        </th>
                        <th className="w-[24%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Email
                        </th>
                        <th className="w-[18%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Agency
                        </th>
                        <th className="w-[16%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Current Role
                        </th>
                        <th className="w-[9%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Status
                        </th>
                        <th className="w-[9%] px-6 text-right text-[11px] font-semibold text-[#6a7282]">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {assignments.map((assignment) => (
                        <tr
                            key={assignment.id}
                            className="h-[60px] border-b border-[#f9fafb] transition hover:bg-[#f8fafc]"
                        >
                            <td className="px-6">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#dbeafe] text-[#1e3a8a]">
                                        <UsersRound
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="text-sm font-semibold text-[#1e2939]">
                                        {assignment.userName}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 text-sm text-[#4a5565]">
                                {assignment.email}
                            </td>
                            <td className="px-4 text-sm text-[#4a5565]">
                                {assignment.agency ?? 'RIKMS Platform'}
                            </td>
                            <td className="px-4">
                                <span className="inline-flex rounded-[4px] bg-[#1e3a8a]/5 px-2 py-1 text-xs font-semibold text-[#1e3a8a]">
                                    {getRoleName(assignment.roleId)}
                                </span>
                            </td>
                            <td className="px-4">
                                <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClasses[assignment.status]}`}
                                >
                                    {assignment.status}
                                </span>
                            </td>
                            <td className="px-6">
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onChangeRole(assignment)}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-2.5 text-xs font-medium text-[#1e3a8a] transition hover:bg-[#f8fafc]"
                                    >
                                        <RefreshCcw
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        Change Role
                                    </button>
                                    <button
                                        type="button"
                                        className="flex size-8 items-center justify-center rounded-[8px] border border-[#e5e7eb] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                                        aria-label={`View ${assignment.userName}`}
                                    >
                                        <Eye
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
