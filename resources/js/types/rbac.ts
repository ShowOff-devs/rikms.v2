export type PermissionModule =
    | 'dashboard'
    | 'research'
    | 'uploads'
    | 'agencies'
    | 'users'
    | 'access-requests'
    | 'approvals'
    | 'analytics'
    | 'reports'
    | 'notifications'
    | 'security'
    | 'archive'
    | 'audit-logs'
    | 'platform-settings'
    | 'rbac'
    | 'roles'
    | 'permissions'
    | 'research-moderation'
    | 'access-monitoring';

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
    slug: string;
    description: string;
    accessScope: 'system' | 'agency';
    isSystemRole: boolean;
    isActive: boolean;
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

export type UserRoleAssignmentStatus =
    | 'active'
    | 'inactive'
    | 'pending'
    | 'pending_activation'
    | 'suspended';

export type UserRoleAssignment = {
    id: string;
    userName: string;
    email: string;
    agency?: string;
    roleId: string;
    status: UserRoleAssignmentStatus;
    rawStatus?: UserRoleAssignmentStatus;
    mfaRequired?: boolean;
    mfaEnabled?: boolean;
    lastLogin?: string;
    createdAt?: string;
    accessScope?: 'system' | 'agency';
};

export type CreateRolePayload = {
    name: string;
    slug: string;
    description: string;
    accessScope: 'system' | 'agency';
    isActive: boolean;
    permissionIds: string[];
};

export type UpdateRolePayload = Omit<CreateRolePayload, 'slug'>;

export type CreateAdminAccountPayload = {
    name: string;
    email: string;
    roleId: string;
    agencyId?: string;
    mfaRequired: boolean;
};
