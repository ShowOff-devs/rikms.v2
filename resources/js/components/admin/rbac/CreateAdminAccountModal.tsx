import { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Agency } from '@/types/admin-users';
import type { CreateAdminAccountPayload, Permission, Role } from '@/types/rbac';

type Props = {
    open: boolean;
    roles: Role[];
    permissions: Permission[];
    agencies: Agency[];
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateAdminAccountPayload) => void;
};

export function CreateAdminAccountModal({
    open,
    roles,
    permissions,
    agencies,
    isSaving,
    onOpenChange,
    onSubmit,
}: Props) {
    const eligibleRoles = useMemo(() => {
        const pagePermissionKeys = new Set([
            'dashboard.view',
            'agencies.view',
            'users.view',
            'research_moderation.view',
            'access_monitoring.view',
            'analytics.view',
            'audit_logs.view',
            'rbac.view',
            'security.view',
            'archive.view',
            'platform_settings.view',
        ]);
        const pagePermissionIds = new Set(
            permissions
                .filter((permission) => pagePermissionKeys.has(permission.key))
                .map((permission) => permission.id),
        );

        return roles.filter(
            (role) =>
                role.isActive &&
                !role.isSystemRole &&
                role.permissionIds.some((permissionId) =>
                    pagePermissionIds.has(permissionId),
                ),
        );
    }, [permissions, roles]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [roleId, setRoleId] = useState(eligibleRoles[0]?.id ?? '');
    const [agencyId, setAgencyId] = useState('');
    const [mfaRequired, setMfaRequired] = useState(true);
    const selectedRole = eligibleRoles.find((role) => role.id === roleId);
    const canSubmit =
        name.trim() !== '' &&
        email.trim() !== '' &&
        roleId !== '' &&
        (selectedRole?.accessScope !== 'agency' || agencyId !== '') &&
        !isSaving;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Invite Admin Account</DialogTitle>
                    <DialogDescription>
                        Invite a moderator or sub-admin without creating or
                        sharing their password.
                    </DialogDescription>
                </DialogHeader>

                {eligibleRoles.length === 0 ? (
                    <div className="rounded-[8px] border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
                        Create an active custom role with permission to view at
                        least one admin page first.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <label className="text-sm font-medium text-[#1e2939]">
                            Full name
                            <input
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                autoComplete="name"
                                className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d1d5db] px-3 outline-none focus:border-[#1e3a8a]"
                            />
                        </label>
                        <label className="text-sm font-medium text-[#1e2939]">
                            Email address
                            <input
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                autoComplete="email"
                                className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d1d5db] px-3 outline-none focus:border-[#1e3a8a]"
                            />
                        </label>
                        <label className="text-sm font-medium text-[#1e2939]">
                            Admin role
                            <select
                                value={roleId}
                                onChange={(event) => {
                                    setRoleId(event.target.value);
                                    setAgencyId('');
                                }}
                                className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d1d5db] bg-white px-3"
                            >
                                {eligibleRoles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name} -{' '}
                                        {role.accessScope === 'agency'
                                            ? 'Agency scoped'
                                            : 'System-wide'}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {selectedRole?.accessScope === 'agency' && (
                            <label className="text-sm font-medium text-[#1e2939]">
                                Assigned agency
                                <select
                                    value={agencyId}
                                    onChange={(event) =>
                                        setAgencyId(event.target.value)
                                    }
                                    className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d1d5db] bg-white px-3"
                                >
                                    <option value="">Select an agency</option>
                                    {agencies.map((agency) => (
                                        <option
                                            key={agency.id}
                                            value={agency.id}
                                        >
                                            {agency.shortName} - {agency.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="flex items-start gap-2 rounded-[8px] border border-[#e5e7eb] p-3 text-sm text-[#1e2939]">
                            <input
                                type="checkbox"
                                checked={mfaRequired}
                                onChange={(event) =>
                                    setMfaRequired(event.target.checked)
                                }
                                className="mt-0.5 size-4 accent-[#1e3a8a]"
                            />
                            <span>
                                <strong className="block">Require MFA</strong>
                                <span className="text-xs text-[#6a7282]">
                                    Require two-factor authentication before
                                    this account can use admin pages.
                                </span>
                            </span>
                        </label>
                        <p className="rounded-[8px] bg-[#eff6ff] p-3 text-xs text-[#1e40af]">
                            RIKMS queues a single-use activation link. The
                            invitee sets their own password and activates the
                            account before signing in at /admin/login.
                        </p>
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
                        disabled={!canSubmit}
                        onClick={() =>
                            onSubmit({
                                name: name.trim(),
                                email: email.trim(),
                                roleId,
                                agencyId:
                                    selectedRole?.accessScope === 'agency'
                                        ? agencyId
                                        : undefined,
                                mfaRequired,
                            })
                        }
                        className="h-10 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {isSaving ? 'Sending...' : 'Create and Send Invite'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
