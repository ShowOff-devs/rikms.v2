import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { agencyScopedPermissionKeys } from '@/components/admin/rbac/rbac-display';
import { RolePermissionEditor } from '@/components/admin/rbac/RolePermissionEditor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { CreateRolePayload, Permission } from '@/types/rbac';

type CreateRoleModalProps = {
    open: boolean;
    permissions: Permission[];
    isSaving: boolean;
    isRoleNameTaken: (name: string) => boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateRolePayload) => void;
};

export function CreateRoleModal({
    open,
    permissions,
    isSaving,
    isRoleNameTaken,
    onOpenChange,
    onSubmit,
}: CreateRoleModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [accessScope, setAccessScope] = useState<'system' | 'agency'>(
        'system',
    );
    const [isActive, setIsActive] = useState(true);
    const [permissionIds, setPermissionIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const availablePermissions =
        accessScope === 'agency'
            ? permissions.filter((permission) =>
                  agencyScopedPermissionKeys.has(permission.key),
              )
            : permissions;

    const resetForm = () => {
        setName('');
        setSlug('');
        setDescription('');
        setPermissionIds([]);
        setError(null);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            resetForm();
        }

        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name.trim()) {
            setError('Role Name is required.');

            return;
        }

        if (isRoleNameTaken(name)) {
            setError('Role Name must be unique.');

            return;
        }

        if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
            setError(
                'Role Identifier must start with a letter and use lowercase letters, numbers, or underscores.',
            );

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

        onSubmit({
            name,
            slug,
            description,
            accessScope,
            isActive,
            permissionIds,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Create New Role
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Define a role and select the permissions it should
                        grant.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Role Name</span>
                            <input
                                value={name}
                                onChange={(event) => {
                                    const nextName = event.target.value;
                                    setName(nextName);
                                    setSlug(
                                        nextName
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, '_')
                                            .replace(/^_+|_+$/g, ''),
                                    );
                                }}
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm transition outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="Moderator"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Unique Role Identifier</span>
                            <input
                                value={slug}
                                onChange={(event) =>
                                    setSlug(event.target.value.toLowerCase())
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 font-mono text-sm"
                                placeholder="moderator"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Access Scope</span>
                            <select
                                value={accessScope}
                                onChange={(event) => {
                                    const nextScope = event.target.value as
                                        | 'system'
                                        | 'agency';

                                    setAccessScope(nextScope);

                                    if (nextScope === 'agency') {
                                        setPermissionIds((current) =>
                                            current.filter((id) =>
                                                permissions.some(
                                                    (permission) =>
                                                        permission.id === id &&
                                                        agencyScopedPermissionKeys.has(
                                                            permission.key,
                                                        ),
                                                ),
                                            ),
                                        );
                                    }
                                }}
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3"
                            >
                                <option value="system">System-wide</option>
                                <option value="agency">
                                    Assigned agency only
                                </option>
                            </select>
                        </label>
                        <label className="flex items-center gap-2 self-end rounded-[8px] border border-[#e5e7eb] px-3 py-2.5 text-sm font-medium text-[#1e2939]">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(event) =>
                                    setIsActive(event.target.checked)
                                }
                                className="size-4 accent-[#1e3a8a]"
                            />
                            Role is active
                        </label>
                    </div>

                    <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                        <span>Description</span>
                        <textarea
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            className="min-h-[84px] w-full resize-none rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm transition outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Role responsibility"
                        />
                    </label>

                    <RolePermissionEditor
                        permissions={availablePermissions}
                        selectedPermissionIds={permissionIds}
                        onChange={setPermissionIds}
                    />

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => handleOpenChange(false)}
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
                            Create Role
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
