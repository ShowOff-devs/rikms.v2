import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
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
    const [description, setDescription] = useState('');
    const [permissionIds, setPermissionIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
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
            description,
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

                    <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                        <span>Role Name</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm transition outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Role name"
                        />
                    </label>

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
                        permissions={permissions}
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
