import { Mail, ShieldCheck, UsersRound } from 'lucide-react';
import {
    getRoleAccent,
    groupPermissionsByModule,
} from '@/components/admin/rbac/rbac-display';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Permission, Role, UserRoleAssignment } from '@/types/rbac';

type UserRoleAssignmentDetailsModalProps = {
    assignment: UserRoleAssignment | null;
    role?: Role;
    permissions: Permission[];
    onOpenChange: (open: boolean) => void;
};

const statusClasses = {
    active: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
    inactive: 'border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565]',
    pending: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
};

export function UserRoleAssignmentDetailsModal({
    assignment,
    role,
    permissions,
    onOpenChange,
}: UserRoleAssignmentDetailsModalProps) {
    const rolePermissionSet = new Set(role?.permissionIds ?? []);
    const groupedPermissions = groupPermissionsByModule(
        permissions.filter((permission) =>
            rolePermissionSet.has(permission.id),
        ),
    );

    return (
        <Dialog open={Boolean(assignment)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[680px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        User Role Assignment
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        View account, agency, current role, and assigned
                        permissions.
                    </DialogDescription>
                </DialogHeader>

                {assignment && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start gap-4 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                            <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#dbeafe] text-[#1e3a8a]">
                                <UsersRound
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-bold text-[#101828]">
                                    {assignment.userName}
                                </h2>
                                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-[#6a7282]">
                                    <Mail
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">
                                        {assignment.email}
                                    </span>
                                </p>
                            </div>
                            <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClasses[assignment.status]}`}
                            >
                                {assignment.status}
                            </span>
                        </div>

                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div className="rounded-[10px] border border-[#e5e7eb] px-3 py-3">
                                <dt className="text-xs text-[#6a7282]">
                                    Agency
                                </dt>
                                <dd className="mt-1 font-semibold text-[#1e2939]">
                                    {assignment.agency ?? 'RIKMS Platform'}
                                </dd>
                            </div>
                            <div className="rounded-[10px] border border-[#e5e7eb] px-3 py-3">
                                <dt className="text-xs text-[#6a7282]">
                                    Current Role
                                </dt>
                                <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-[#1e2939]">
                                    <ShieldCheck
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    {role?.name ?? 'Unassigned'}
                                </dd>
                            </div>
                        </dl>

                        {role && (
                            <section className="rounded-[10px] border border-[#e5e7eb] p-4">
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`flex size-10 items-center justify-center rounded-[10px] border ${getRoleAccent(role.name)}`}
                                    >
                                        <ShieldCheck
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-bold text-[#1e2939]">
                                                {role.name}
                                            </h3>
                                            {role.isSystemRole && (
                                                <span className="rounded-[4px] border border-[#e5e7eb] bg-[#f9fafb] px-2 py-1 text-[11px] font-semibold text-[#4a5565]">
                                                    System role
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                                            {role.description ||
                                                'No role description provided.'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section>
                            <h3 className="text-sm font-bold text-[#1e2939]">
                                Assigned Permissions
                            </h3>
                            <div className="mt-3 space-y-3">
                                {groupedPermissions.length > 0 ? (
                                    groupedPermissions.map((group) => (
                                        <div
                                            key={group.module}
                                            className="rounded-[10px] border border-[#e5e7eb] p-3"
                                        >
                                            <p className="text-sm font-semibold text-[#1e2939]">
                                                {group.label}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {group.permissions.map(
                                                    (permission) => (
                                                        <span
                                                            key={permission.id}
                                                            className="rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-1 text-xs text-[#4a5565]"
                                                        >
                                                            {permission.name}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3 text-sm text-[#6a7282]">
                                        No permissions are assigned to this
                                        role.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[8px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
