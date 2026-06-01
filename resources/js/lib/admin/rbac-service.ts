import { fetchApi } from '@/lib/api-client';
import type {
    CreateRolePayload,
    Permission,
    Role,
    RoleChangeHistory,
    UpdateRolePayload,
    UserRoleAssignment,
} from '@/types/rbac';

let roleChangeHistory: RoleChangeHistory[] = [];
let cachedPermissions: Permission[] = [];
let cachedAssignments: UserRoleAssignment[] = [];

function toPermission(permission: Permission): Permission {
    return {
        ...permission,
        module: permission.module,
    };
}

function permissionPayload(permissionIds: string[]) {
    return permissionIds.map((id) => Number(id)).filter(Number.isFinite);
}

export async function getRoles(): Promise<Role[]> {
    const response = await fetchApi<Role[]>('/api/admin/rbac/roles');

    return response.data;
}

export async function getRoleById(id: string): Promise<Role | null> {
    const roles = await getRoles();

    return roles.find((role) => role.id === id) ?? null;
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
    const response = await fetchApi<Role>('/api/admin/rbac/roles', {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            description: payload.description,
            permission_ids: permissionPayload(payload.permissionIds),
        }),
    });

    return response.data;
}

export async function updateRole(
    id: string,
    payload: UpdateRolePayload,
): Promise<Role> {
    await fetchApi<Role>(`/api/admin/rbac/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name: payload.name,
            description: payload.description,
        }),
    });

    const permissionResponse = await fetchApi<Role>(
        `/api/admin/rbac/roles/${id}/permissions`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                permission_ids: permissionPayload(payload.permissionIds),
            }),
        },
    );

    return permissionResponse.data;
}

export async function deleteRole(id: string): Promise<void> {
    void id;

    throw new Error(
        'Role deletion is deferred until a protected archive/delete endpoint is implemented.',
    );
}

export async function getPermissions(): Promise<Permission[]> {
    const response = await fetchApi<Permission[]>('/api/admin/rbac/permissions');

    cachedPermissions = response.data.map(toPermission);

    return cachedPermissions;
}

export async function getRoleChangeHistory(): Promise<RoleChangeHistory[]> {
    return roleChangeHistory.map((change) => ({ ...change }));
}

export async function addRoleChangeHistory(
    payload: Omit<RoleChangeHistory, 'id' | 'date'> & {
        id?: string;
        date?: string;
    },
): Promise<RoleChangeHistory> {
    const createdChange: RoleChangeHistory = {
        ...payload,
        id: payload.id ?? `change-${Date.now()}`,
        date: payload.date ?? new Date().toISOString(),
        before: payload.before ? [...payload.before] : undefined,
        after: payload.after ? [...payload.after] : undefined,
    };

    roleChangeHistory = [createdChange, ...roleChangeHistory];

    return { ...createdChange };
}

export async function getUserRoleAssignments(): Promise<UserRoleAssignment[]> {
    const response = await fetchApi<UserRoleAssignment[]>('/api/admin/rbac/users');

    cachedAssignments = response.data;

    return cachedAssignments;
}

export async function updateUserRole(
    userId: string,
    roleId: string,
): Promise<UserRoleAssignment> {
    const existingAssignment = cachedAssignments.find((assignment) => assignment.id === userId);

    if (existingAssignment?.roleId && existingAssignment.roleId !== roleId) {
        await fetchApi<UserRoleAssignment>(
            `/api/admin/rbac/users/${userId}/roles/${existingAssignment.roleId}`,
            {
                method: 'DELETE',
                body: JSON.stringify({ confirm_self_removal: false }),
            },
        );
    }

    const response = await fetchApi<UserRoleAssignment>(
        `/api/admin/rbac/users/${userId}/roles`,
        {
            method: 'POST',
            body: JSON.stringify({ role_id: Number(roleId) }),
        },
    );

    cachedAssignments = cachedAssignments.map((assignment) =>
        assignment.id === userId ? response.data : assignment,
    );

    return response.data;
}

export function getPermissionKeyDiff(permissionIds: string[]) {
    return permissionIds
        .map((id) => cachedPermissions.find((permission) => permission.id === id))
        .filter((permission): permission is Permission => Boolean(permission))
        .map((permission) => permission.key);
}
