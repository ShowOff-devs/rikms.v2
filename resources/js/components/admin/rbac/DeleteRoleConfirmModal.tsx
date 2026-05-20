import { Loader2, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Role } from '@/types/rbac';

type DeleteRoleConfirmModalProps = {
    role: Role | null;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (role: Role) => void;
};

export function DeleteRoleConfirmModal({
    role,
    isSaving,
    onOpenChange,
    onConfirm,
}: DeleteRoleConfirmModalProps) {
    const isProtected = Boolean(role?.isSystemRole);

    return (
        <Dialog open={Boolean(role)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Delete Role?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This role will be removed from the system. Users
                        assigned to this role may lose access to related
                        features.
                    </DialogDescription>
                </DialogHeader>

                {role && (
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            {role.name}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                            {isProtected
                                ? 'Protected system roles cannot be deleted.'
                                : `${role.userCount} assigned users and ${role.permissionIds.length} permissions are tied to this role.`}
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[8px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSaving || isProtected || !role}
                        onClick={() => role && onConfirm(role)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <Trash2 className="size-4" aria-hidden="true" />
                        )}
                        Delete Role
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
