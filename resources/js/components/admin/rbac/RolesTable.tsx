import { Shield, ShieldCheck } from 'lucide-react';
import {
    formatRbacDate,
    getRoleAccent,
} from '@/components/admin/rbac/rbac-display';
import { RoleActionsMenu } from '@/components/admin/rbac/RoleActionsMenu';
import type { Role } from '@/types/rbac';

type RolesTableProps = {
    roles: Role[];
    isLoading: boolean;
    onView: (role: Role) => void;
    onEdit: (role: Role) => void;
    onDuplicate: (role: Role) => void;
    onDelete: (role: Role) => void;
};

export function RolesTable({
    roles,
    isLoading,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
}: RolesTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 px-5 py-5">
                {Array.from({ length: 5 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[64px] animate-pulse rounded-[8px] bg-[#f3f4f6]"
                    />
                ))}
            </div>
        );
    }

    if (roles.length === 0) {
        return (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-[#dbeafe] text-[#1e3a8a]">
                    <Shield className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-[#1e2939]">
                    No roles found
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-5 text-[#6a7282]">
                    Adjust the search query or create a new role for platform
                    access governance.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
                <thead>
                    <tr className="h-10 border-b border-[#f3f4f6] bg-[#f9fafb] text-left">
                        <th className="w-[30%] px-6 text-[11px] font-semibold text-[#6a7282]">
                            Role Name
                        </th>
                        <th className="w-[25%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Description
                        </th>
                        <th className="w-[8%] px-4 text-center text-[11px] font-semibold text-[#6a7282]">
                            Users
                        </th>
                        <th className="w-[12%] px-4 text-center text-[11px] font-semibold text-[#6a7282]">
                            Permissions
                        </th>
                        <th className="w-[13%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Created
                        </th>
                        <th className="w-[12%] px-6 text-right text-[11px] font-semibold text-[#6a7282]">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {roles.map((role) => (
                        <tr
                            key={role.id}
                            className="h-[65px] border-b border-[#f9fafb] transition hover:bg-[#f8fafc]"
                        >
                            <td className="px-6">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border ${getRoleAccent(role.name)}`}
                                    >
                                        <Shield
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-bold text-[#101828]">
                                                {role.name}
                                            </span>
                                            {role.isSystemRole && (
                                                <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#e5e7eb] bg-[#f9fafb] px-1.5 py-0.5 text-[10px] font-medium text-[#4a5565]">
                                                    <ShieldCheck
                                                        className="size-2.5"
                                                        aria-hidden="true"
                                                    />
                                                    System
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </div>
                            </td>
                            <td className="px-4">
                                <p className="line-clamp-2 text-xs leading-4 text-[#6a7282]">
                                    {role.description}
                                </p>
                            </td>
                            <td className="px-4 text-center text-sm font-semibold text-[#1e2939]">
                                {role.userCount}
                            </td>
                            <td className="px-4 text-center text-sm font-semibold text-[#1e2939]">
                                {role.permissionIds.length}
                            </td>
                            <td className="px-4 text-xs text-[#6a7282]">
                                {formatRbacDate(role.createdAt)}
                            </td>
                            <td className="px-6">
                                <div className="flex justify-end">
                                    <RoleActionsMenu
                                        role={role}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onDuplicate={onDuplicate}
                                        onDelete={onDelete}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
