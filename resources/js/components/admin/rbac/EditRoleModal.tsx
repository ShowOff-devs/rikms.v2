import { Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { formatRbacDate } from '@/components/admin/rbac/rbac-display';
import { RolePermissionEditor } from '@/components/admin/rbac/RolePermissionEditor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Permission, Role, UpdateRolePayload } from '@/types/rbac';

type EditRoleModalProps = {
    role: Role | null;
    permissions: Permission[];
    isSaving: boolean;
    isRoleNameTaken: (name: string, currentRoleId?: string) => boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (role: Role, payload: UpdateRolePayload) => void;
};

export function EditRoleModal({
    role,
    permissions,
    isSaving,
    isRoleNameTaken,
    onOpenChange,
    onSubmit,
}: EditRoleModalProps) {
    return (
        <Dialog open={Boolean(role)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Edit Role
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Update role details and assigned permissions for RBAC
                        governance.
                    </DialogDescription>
                </DialogHeader>

                {role && (
                    <EditRoleForm
                        key={role.id}
                        role={role}
                        permissions={permissions}
                        isSaving={isSaving}
                        isRoleNameTaken={isRoleNameTaken}
                        onCancel={() => onOpenChange(false)}
                        onSubmit={onSubmit}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

type EditRoleFormProps = {
    role: Role;
    permissions: Permission[];
    isSaving: boolean;
    isRoleNameTaken: (name: string, currentRoleId?: string) => boolean;
    onCancel: () => void;
    onSubmit: (role: Role, payload: UpdateRolePayload) => void;
};

function EditRoleForm({
    role,
    permissions,
    isSaving,
    isRoleNameTaken,
    onCancel,
    onSubmit,
}: EditRoleFormProps) {
    const [name, setName] = useState(role.name);
    const [description, setDescription] = useState(role.description);
    const [permissionIds, setPermissionIds] = useState<string[]>([
        ...role.permissionIds,
    ]);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!role.isSystemRole && !name.trim()) {
            setError('Role Name is required.');

            return;
        }

        if (!role.isSystemRole && isRoleNameTaken(name, role.id)) {
            setError('Role Name must be unique.');

            return;
        }

        if (!description.trim()) {
            setError('Description is required.');

            return;
        }

        if (permissionIds.length === 0) {
            setError('Select at least one permission.');

            return;
        }

        onSubmit(role, {
            name,
            description,
            permissionIds,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                    {error}
                </div>
            )}

            {role.isSystemRole && (
                <div className="flex gap-2 rounded-[10px] border border-[#fee685] bg-[#fffbeb] px-3 py-2 text-sm text-[#bb4d00]">
                    <ShieldCheck
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>
                        System roles may have restricted editing to protect
                        platform security.
                    </span>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Role Name</span>
                    <input
                        value={name}
                        disabled={role.isSystemRole}
                        onChange={(event) => setName(event.target.value)}
                        className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm transition outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10 disabled:bg-[#f9fafb] disabled:text-[#6a7282]"
                        placeholder="Role name"
                    />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[10px] border border-[#e5e7eb] px-3 py-2">
                        <p className="text-xs text-[#6a7282]">Created</p>
                        <p className="mt-1 text-sm font-semibold text-[#1e2939]">
                            {formatRbacDate(role.createdAt)}
                        </p>
                    </div>
                    <div className="rounded-[10px] border border-[#e5e7eb] px-3 py-2">
                        <p className="text-xs text-[#6a7282]">System Role</p>
                        <p className="mt-1 text-sm font-semibold text-[#1e2939]">
                            {role.isSystemRole ? 'Yes' : 'No'}
                        </p>
                    </div>
                </div>
            </div>

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Description</span>
                <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-[84px] w-full resize-none rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm transition outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="Role responsibility"
                />
            </label>

            <RolePermissionEditor
                permissions={permissions}
                selectedPermissionIds={permissionIds}
                onChange={setPermissionIds}
            />

            <DialogFooter>
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-10 rounded-[8px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3478] disabled:cursor-wait disabled:opacity-70"
                >
                    {isSaving && (
                        <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    Save Changes
                </button>
            </DialogFooter>
        </form>
    );
}
