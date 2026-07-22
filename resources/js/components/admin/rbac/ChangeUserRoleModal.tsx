import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Role, UserRoleAssignment } from '@/types/rbac';

type Props = {
    assignment: UserRoleAssignment | null;
    roles: Role[];
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (assignment: UserRoleAssignment, roleId: string) => void;
};

export function ChangeUserRoleModal({
    assignment,
    roles,
    isSaving,
    onOpenChange,
    onSubmit,
}: Props) {
    const [roleId, setRoleId] = useState(assignment?.roleId ?? '');

    const currentRole = roles.find((role) => role.id === assignment?.roleId);
    const selectedRole = roles.find((role) => role.id === roleId);

    return (
        <Dialog open={Boolean(assignment)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Change Role</DialogTitle>
                    <DialogDescription>
                        This will replace the user&apos;s current administrative
                        role. The change takes effect immediately.
                    </DialogDescription>
                </DialogHeader>
                {assignment && (
                    <div className="space-y-4">
                        <p className="text-sm text-[#4a5565]">
                            Current role:{' '}
                            <strong>{currentRole?.name ?? 'Unassigned'}</strong>
                        </p>
                        <label className="block text-sm font-medium text-[#1e2939]">
                            New role
                            <select
                                className="mt-2 h-10 w-full rounded-[8px] border border-[#d1d5db] bg-white px-3"
                                value={roleId}
                                onChange={(event) =>
                                    setRoleId(event.target.value)
                                }
                            >
                                {roles
                                    .filter((role) => role.isActive)
                                    .map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        {(currentRole?.name === 'Super Admin' ||
                            selectedRole?.name === 'Super Admin') && (
                            <p className="rounded-[8px] bg-[#fff7ed] p-3 text-sm text-[#9a3412]">
                                Changing a Super Admin role can affect
                                administrative access. The system will prevent
                                removing the final active Super Admin.
                            </p>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[8px] border px-4 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={
                            !assignment ||
                            !roleId ||
                            roleId === assignment.roleId ||
                            isSaving
                        }
                        onClick={() =>
                            assignment && onSubmit(assignment, roleId)
                        }
                        className="h-10 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Save Role Change
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
