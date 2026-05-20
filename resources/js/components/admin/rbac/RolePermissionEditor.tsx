import { groupPermissionsByModule } from '@/components/admin/rbac/rbac-display';
import { Checkbox } from '@/components/ui/checkbox';
import type { Permission } from '@/types/rbac';

type RolePermissionEditorProps = {
    permissions: Permission[];
    selectedPermissionIds: string[];
    onChange: (permissionIds: string[]) => void;
};

export function RolePermissionEditor({
    permissions,
    selectedPermissionIds,
    onChange,
}: RolePermissionEditorProps) {
    const groups = groupPermissionsByModule(permissions);
    const selectedSet = new Set(selectedPermissionIds);

    const togglePermission = (permissionId: string) => {
        if (selectedSet.has(permissionId)) {
            onChange(selectedPermissionIds.filter((id) => id !== permissionId));

            return;
        }

        onChange([...selectedPermissionIds, permissionId]);
    };

    const setGroupPermissions = (
        permissionIds: string[],
        selected: boolean,
    ) => {
        if (selected) {
            onChange(
                Array.from(
                    new Set([...selectedPermissionIds, ...permissionIds]),
                ),
            );

            return;
        }

        onChange(
            selectedPermissionIds.filter((id) => !permissionIds.includes(id)),
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1e2939]">
                    Permission Groups
                </span>
                <span className="text-xs font-medium text-[#6a7282]">
                    {selectedPermissionIds.length} selected
                </span>
            </div>

            <div className="space-y-3">
                {groups.map((group) => {
                    const groupPermissionIds = group.permissions.map(
                        (permission) => permission.id,
                    );
                    const selectedInGroup = groupPermissionIds.filter((id) =>
                        selectedSet.has(id),
                    ).length;

                    return (
                        <section
                            key={group.module}
                            className="rounded-[10px] border border-[#e5e7eb]"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3f4f6] px-3 py-2.5">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1e2939]">
                                        {group.label}
                                    </h3>
                                    <p className="text-xs text-[#99a1af]">
                                        {selectedInGroup} of{' '}
                                        {groupPermissionIds.length} enabled
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setGroupPermissions(
                                                groupPermissionIds,
                                                true,
                                            )
                                        }
                                        className="text-xs font-semibold text-[#1e3a8a]"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-[#d1d5db]">/</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setGroupPermissions(
                                                groupPermissionIds,
                                                false,
                                            )
                                        }
                                        className="text-xs font-semibold text-[#6a7282]"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-2 p-3 sm:grid-cols-2">
                                {group.permissions.map((permission) => (
                                    <label
                                        key={permission.id}
                                        className="flex cursor-pointer gap-2 rounded-[8px] border border-[#f3f4f6] px-3 py-2 transition hover:bg-[#f8fafc]"
                                    >
                                        <Checkbox
                                            checked={selectedSet.has(
                                                permission.id,
                                            )}
                                            onCheckedChange={() =>
                                                togglePermission(permission.id)
                                            }
                                            className="mt-0.5"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-[#1e2939]">
                                                {permission.name}
                                            </span>
                                            <code className="mt-0.5 block truncate text-xs text-[#6a7282]">
                                                {permission.key}
                                            </code>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
