export type PermissionModule =
    | 'research'
    | 'upload-research'
    | 'agency'
    | 'users'
    | 'access-requests'
    | 'analytics'
    | 'security'
    | 'archive'
    | 'platform-settings';

export type Permission = {
    id: string;
    key: string;
    name: string;
    description: string;
    module: PermissionModule;
};

export type Role = {
    id: string;
    name: string;
    description: string;
    isSystemRole: boolean;
    userCount: number;
    permissionIds: string[];
    createdAt: string;
    updatedAt?: string;
    assignedUsers?: RoleAssignedUser[];
};

export type RoleAssignedUser = {
    id: string;
    name: string;
    email: string;
    agency?: string;
};

export type RoleChangeType =
    | 'permission-updated'
    | 'role-modified'
    | 'role-created'
    | 'role-deleted';

export type RoleChangeHistory = {
    id: string;
    roleId: string;
    roleName: string;
    changedBy: string;
    changeType: RoleChangeType;
    date: string;
    before?: string[];
    after?: string[];
    summary?: string;
};

export type UserRoleAssignmentStatus = 'active' | 'inactive' | 'pending';

export type UserRoleAssignment = {
    id: string;
    userName: string;
    email: string;
    agency?: string;
    roleId: string;
    status: UserRoleAssignmentStatus;
};

export type CreateRolePayload = {
    name: string;
    description: string;
    permissionIds: string[];
};

export type UpdateRolePayload = CreateRolePayload;
