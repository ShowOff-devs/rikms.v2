import { fetchApi } from '@/lib/api-client';
import type {
    CreateRolePayload,
    CreateAdminAccountPayload,
    Permission,
    Role,
    RoleChangeHistory,
    UpdateRolePayload,
    UserRoleAssignment,
} from '@/types/rbac';

let cachedPermissions: Permission[] = [];
let cachedAssignments: UserRoleAssignment[] = [];

export type RbacPagination = {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
};

type ApiPaginationMeta = {
    pagination?: {
        current_page?: number;
        per_page?: number;
        total?: number;
        last_page?: number;
    };
};

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
    const response = await fetchApi<Role>(`/api/admin/rbac/roles/${id}`);

    return response.data;
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
    const response = await fetchApi<Role>('/api/admin/rbac/roles', {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            slug: payload.slug,
            description: payload.description,
            access_scope: payload.accessScope,
            is_active: payload.isActive,
            permission_ids: permissionPayload(payload.permissionIds),
        }),
    });

    return response.data;
}

export async function updateRole(
    id: string,
    payload: UpdateRolePayload,
): Promise<Role> {
    const permissionResponse = await fetchApi<Role>(
        `/api/admin/rbac/roles/${id}/permissions`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                name: payload.name,
                description: payload.description,
                access_scope: payload.accessScope,
                is_active: payload.isActive,
                permission_ids: permissionPayload(payload.permissionIds),
            }),
        },
    );

    return permissionResponse.data;
}

export async function deleteRole(id: string): Promise<void> {
    await fetchApi(`/api/admin/rbac/roles/${id}`, {
        method: 'DELETE',
    });
}

export async function getPermissions(): Promise<Permission[]> {
    const response = await fetchApi<Permission[]>(
        '/api/admin/rbac/permissions',
    );

    cachedPermissions = response.data.map(toPermission);

    return cachedPermissions;
}

export async function getRoleChangeHistory(): Promise<RoleChangeHistory[]> {
    const response = await fetchApi<RoleChangeHistory[]>(
        '/api/admin/rbac/history',
    );

    return response.data;
}

export async function getUserRoleAssignments(
    options: {
        page?: number;
        perPage?: number;
        query?: string;
        activeOnly?: boolean;
    } = {},
): Promise<{ assignments: UserRoleAssignment[]; pagination: RbacPagination }> {
    const params = new URLSearchParams({
        page: String(options.page ?? 1),
        per_page: String(options.perPage ?? 15),
        active_only: String(options.activeOnly ?? false),
    });

    if (options.query?.trim()) {
        params.set('query', options.query.trim());
    }

    const response = await fetchApi<UserRoleAssignment[], ApiPaginationMeta>(
        `/api/admin/rbac/users?${params}`,
    );

    cachedAssignments = response.data;
    const pagination = response.meta.pagination;

    return {
        assignments: cachedAssignments,
        pagination: {
            currentPage: pagination?.current_page ?? options.page ?? 1,
            perPage: pagination?.per_page ?? options.perPage ?? 15,
            total: pagination?.total ?? cachedAssignments.length,
            lastPage: pagination?.last_page ?? 1,
        },
    };
}

export async function updateUserRole(
    userId: string,
    roleId: string,
): Promise<UserRoleAssignment> {
    const response = await fetchApi<UserRoleAssignment>(
        `/api/admin/rbac/users/${userId}/role`,
        {
            method: 'PUT',
            body: JSON.stringify({ role_id: Number(roleId) }),
        },
    );

    cachedAssignments = cachedAssignments.map((assignment) =>
        assignment.id === userId ? response.data : assignment,
    );

    return response.data;
}

export async function createAdminAccount(
    payload: CreateAdminAccountPayload,
): Promise<UserRoleAssignment> {
    const response = await fetchApi<UserRoleAssignment>(
        '/api/admin/rbac/users',
        {
            method: 'POST',
            body: JSON.stringify({
                name: payload.name,
                email: payload.email,
                role_id: Number(payload.roleId),
                agency_id: payload.agencyId ? Number(payload.agencyId) : null,
                mfa_required: payload.mfaRequired,
            }),
        },
    );

    cachedAssignments = [response.data, ...cachedAssignments];

    return response.data;
}

export async function resendAdminInvitation(userId: string): Promise<void> {
    await fetchApi(`/api/admin/rbac/users/${userId}/invitation`, {
        method: 'POST',
    });
}

export async function suspendAdminAccount(
    userId: string,
): Promise<UserRoleAssignment> {
    const response = await fetchApi<UserRoleAssignment>(
        `/api/admin/rbac/users/${userId}/suspend`,
        { method: 'POST' },
    );

    return response.data;
}

export async function reactivateAdminAccount(
    userId: string,
): Promise<UserRoleAssignment> {
    const response = await fetchApi<UserRoleAssignment>(
        `/api/admin/rbac/users/${userId}/reactivate`,
        { method: 'POST' },
    );

    return response.data;
}

export async function revokeAdminAccountSessions(
    userId: string,
): Promise<void> {
    await fetchApi(`/api/admin/rbac/users/${userId}/sessions`, {
        method: 'DELETE',
    });
}

export function getPermissionKeyDiff(permissionIds: string[]) {
    return permissionIds
        .map((id) =>
            cachedPermissions.find((permission) => permission.id === id),
        )
        .filter((permission): permission is Permission => Boolean(permission))
        .map((permission) => permission.key);
}
