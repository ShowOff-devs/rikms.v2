import { permissionModuleLabels } from '@/data/mock-rbac';
import type {
    Permission,
    PermissionModule,
    RoleChangeType,
} from '@/types/rbac';

export const roleChangeTypeLabels: Record<RoleChangeType, string> = {
    'permission-updated': 'Permission Updated',
    'role-modified': 'Role Modified',
    'role-created': 'Role Created',
    'role-deleted': 'Role Deleted',
};

export const permissionModuleOrder: PermissionModule[] = [
    'research',
    'upload-research',
    'agency',
    'users',
    'access-requests',
    'analytics',
    'security',
    'archive',
    'platform-settings',
];

export function formatRbacDate(value: string) {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

export function groupPermissionsByModule(permissions: Permission[]) {
    return permissionModuleOrder
        .map((module) => ({
            module,
            label: permissionModuleLabels[module],
            permissions: permissions.filter(
                (permission) => permission.module === module,
            ),
        }))
        .filter((group) => group.permissions.length > 0);
}

export function getRoleAccent(roleName: string) {
    if (roleName === 'Super Admin') {
        return 'border-[#fecaca] bg-[#fee2e2] text-[#fb2c36]';
    }

    if (roleName === 'System Moderator') {
        return 'border-[#fde68a] bg-[#fef3c7] text-[#f59e0b]';
    }

    if (roleName === 'Data Manager') {
        return 'border-[#bbf7d0] bg-[#dcfce7] text-[#00a63e]';
    }

    if (roleName === 'Agency Administrator') {
        return 'border-[#bfdbfe] bg-[#dbeafe] text-[#2563eb]';
    }

    return 'border-[#ddd6fe] bg-[#ede9fe] text-[#8b5cf6]';
}

export function getChangeBadgeClass(changeType: RoleChangeType) {
    if (changeType === 'role-created') {
        return 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]';
    }

    if (changeType === 'role-modified') {
        return 'border-[#bedbff] bg-[#eff6ff] text-[#1447e6]';
    }

    if (changeType === 'role-deleted') {
        return 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]';
    }

    return 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]';
}
