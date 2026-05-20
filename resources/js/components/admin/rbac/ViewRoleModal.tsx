import { Shield, ShieldCheck, UsersRound } from 'lucide-react';
import {
    formatRbacDate,
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
import type { Permission, Role } from '@/types/rbac';

type ViewRoleModalProps = {
    role: Role | null;
    permissions: Permission[];
    onOpenChange: (open: boolean) => void;
};

export function ViewRoleModal({
    role,
    permissions,
    onOpenChange,
}: ViewRoleModalProps) {
    const rolePermissionSet = new Set(role?.permissionIds ?? []);
    const groupedPermissions = groupPermissionsByModule(
        permissions.filter((permission) =>
            rolePermissionSet.has(permission.id),
        ),
    );

    return (
        <Dialog open={Boolean(role)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[760px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Role Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Inspect role metadata, assigned users, and permissions.
                    </DialogDescription>
                </DialogHeader>

                {role && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start gap-4 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                            <span
                                className={`flex size-11 items-center justify-center rounded-[10px] border ${getRoleAccent(role.name)}`}
                            >
                                <Shield className="size-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-[#101828]">
                                        {role.name}
                                    </h2>
                                    {role.isSystemRole && (
                                        <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] font-semibold text-[#4a5565]">
                                            <ShieldCheck
                                                className="size-3"
                                                aria-hidden="true"
                                            />
                                            System role
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                                    {role.description}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-4">
                            {[
                                ['Assigned Users', role.userCount],
                                ['Permissions', role.permissionIds.length],
                                ['Created', formatRbacDate(role.createdAt)],
                                [
                                    'Last Updated',
                                    role.updatedAt
                                        ? formatRbacDate(role.updatedAt)
                                        : 'Not updated',
                                ],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-3"
                                >
                                    <p className="text-xs text-[#6a7282]">
                                        {label}
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-[#1e2939]">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <section>
                            <h3 className="text-sm font-bold text-[#1e2939]">
                                Permission Groups
                            </h3>
                            <div className="mt-3 space-y-3">
                                {groupedPermissions.map((group) => (
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
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-sm font-bold text-[#1e2939]">
                                Assigned Users Preview
                            </h3>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {(role.assignedUsers ?? []).length > 0 ? (
                                    role.assignedUsers?.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 rounded-[10px] border border-[#e5e7eb] px-3 py-2"
                                        >
                                            <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#dbeafe] text-[#1e3a8a]">
                                                <UsersRound
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-semibold text-[#1e2939]">
                                                    {user.name}
                                                </span>
                                                <span className="block truncate text-xs text-[#6a7282]">
                                                    {user.email}
                                                </span>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3 text-sm text-[#6a7282] sm:col-span-2">
                                        No assigned user preview is available
                                        for this role.
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
