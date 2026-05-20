import {
    mockPermissions,
    mockRoleChangeHistory,
    mockRoles,
    mockUserRoleAssignments,
} from '@/data/mock-rbac';
import type {
    CreateRolePayload,
    Permission,
    Role,
    RoleChangeHistory,
    UpdateRolePayload,
    UserRoleAssignment,
} from '@/types/rbac';

const mockNetworkDelay = (duration = 160) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

let roles: Role[] = mockRoles.map(cloneRole);
let roleChangeHistory: RoleChangeHistory[] = mockRoleChangeHistory.map(
    (change) => ({
        ...change,
        before: change.before ? [...change.before] : undefined,
        after: change.after ? [...change.after] : undefined,
    }),
);
let userRoleAssignments = mockUserRoleAssignments.map((assignment) => ({
    ...assignment,
}));

function cloneRole(role: Role): Role {
    return {
        ...role,
        permissionIds: [...role.permissionIds],
        assignedUsers: role.assignedUsers?.map((user) => ({ ...user })),
    };
}

function clonePermission(permission: Permission): Permission {
    return { ...permission };
}

function cloneHistory(change: RoleChangeHistory): RoleChangeHistory {
    return {
        ...change,
        before: change.before ? [...change.before] : undefined,
        after: change.after ? [...change.after] : undefined,
    };
}

function normalizeSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function getPermissionKeys(permissionIds: string[]) {
    return permissionIds
        .map((id) => mockPermissions.find((permission) => permission.id === id))
        .filter((permission): permission is Permission => Boolean(permission))
        .map((permission) => permission.key);
}

export async function getRoles(): Promise<Role[]> {
    await mockNetworkDelay();

    return roles.map(cloneRole);
}

export async function getRoleById(id: string): Promise<Role | null> {
    await mockNetworkDelay();

    const role = roles.find((item) => item.id === id);

    return role ? cloneRole(role) : null;
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
    await mockNetworkDelay(260);

    const now = new Date().toISOString();
    const idBase = normalizeSlug(payload.name);
    const id = roles.some((role) => role.id === idBase)
        ? `${idBase}-${Date.now()}`
        : idBase;

    const createdRole: Role = {
        id,
        name: payload.name.trim(),
        description: payload.description.trim(),
        isSystemRole: false,
        userCount: 0,
        permissionIds: [...payload.permissionIds],
        createdAt: now,
        updatedAt: now,
        assignedUsers: [],
    };

    roles = [createdRole, ...roles];

    return cloneRole(createdRole);
}

export async function updateRole(
    id: string,
    payload: UpdateRolePayload,
): Promise<Role> {
    await mockNetworkDelay(260);

    const existingRole = roles.find((role) => role.id === id);

    if (!existingRole) {
        throw new Error('Role could not be updated.');
    }

    const updatedRole: Role = {
        ...existingRole,
        name: existingRole.isSystemRole
            ? existingRole.name
            : payload.name.trim(),
        description: payload.description.trim(),
        permissionIds: [...payload.permissionIds],
        updatedAt: new Date().toISOString(),
    };

    roles = roles.map((role) => (role.id === id ? updatedRole : role));

    return cloneRole(updatedRole);
}

export async function deleteRole(id: string): Promise<void> {
    await mockNetworkDelay(240);

    const role = roles.find((item) => item.id === id);

    if (!role) {
        throw new Error('Role could not be deleted.');
    }

    if (role.isSystemRole) {
        throw new Error('Protected system roles cannot be deleted.');
    }

    roles = roles.filter((item) => item.id !== id);
    userRoleAssignments = userRoleAssignments.filter(
        (assignment) => assignment.roleId !== id,
    );
}

export async function getPermissions(): Promise<Permission[]> {
    await mockNetworkDelay();

    return mockPermissions.map(clonePermission);
}

export async function getRoleChangeHistory(): Promise<RoleChangeHistory[]> {
    await mockNetworkDelay();

    return roleChangeHistory.map(cloneHistory);
}

export async function addRoleChangeHistory(
    payload: Omit<RoleChangeHistory, 'id' | 'date'> & {
        id?: string;
        date?: string;
    },
): Promise<RoleChangeHistory> {
    await mockNetworkDelay(80);

    const createdChange: RoleChangeHistory = {
        ...payload,
        id: payload.id ?? `change-${Date.now()}`,
        date: payload.date ?? new Date().toISOString(),
        before: payload.before ? [...payload.before] : undefined,
        after: payload.after ? [...payload.after] : undefined,
    };

    roleChangeHistory = [createdChange, ...roleChangeHistory];

    return cloneHistory(createdChange);
}

export async function getUserRoleAssignments(): Promise<UserRoleAssignment[]> {
    await mockNetworkDelay();

    return userRoleAssignments.map((assignment) => ({ ...assignment }));
}

export async function updateUserRole(
    userId: string,
    roleId: string,
): Promise<UserRoleAssignment> {
    await mockNetworkDelay(220);

    const assignment = userRoleAssignments.find((item) => item.id === userId);
    const role = roles.find((item) => item.id === roleId);

    if (!assignment || !role) {
        throw new Error('User role assignment could not be updated.');
    }

    const updatedAssignment = { ...assignment, roleId };

    userRoleAssignments = userRoleAssignments.map((item) =>
        item.id === userId ? updatedAssignment : item,
    );

    return { ...updatedAssignment };
}

export function getPermissionKeyDiff(permissionIds: string[]) {
    return getPermissionKeys(permissionIds);
}
