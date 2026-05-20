import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { CreateRoleModal } from '@/components/admin/rbac/CreateRoleModal';
import { DeleteRoleConfirmModal } from '@/components/admin/rbac/DeleteRoleConfirmModal';
import { EditRoleModal } from '@/components/admin/rbac/EditRoleModal';
import { PermissionsTab } from '@/components/admin/rbac/PermissionsTab';
import { RBACHeader } from '@/components/admin/rbac/RBACHeader';
import { RBACStats } from '@/components/admin/rbac/RBACStats';
import { RBACTabs } from '@/components/admin/rbac/RBACTabs';
import type { RBACTab } from '@/components/admin/rbac/RBACTabs';
import { RoleChangeDiffModal } from '@/components/admin/rbac/RoleChangeDiffModal';
import { RoleChangeHistory } from '@/components/admin/rbac/RoleChangeHistory';
import { RolesTable } from '@/components/admin/rbac/RolesTable';
import { UserRoleAssignmentsTab } from '@/components/admin/rbac/UserRoleAssignmentsTab';
import { ViewRoleModal } from '@/components/admin/rbac/ViewRoleModal';
import {
    addRoleChangeHistory,
    createRole,
    deleteRole,
    getPermissionKeyDiff,
    getPermissions,
    getRoleChangeHistory,
    getRoles,
    getUserRoleAssignments,
    updateRole,
    updateUserRole,
} from '@/lib/admin/rbac-service';
import type {
    CreateRolePayload,
    Permission,
    Role,
    RoleChangeHistory as RoleChangeHistoryType,
    UpdateRolePayload,
    UserRoleAssignment,
} from '@/types/rbac';

function matchesQuery(value: string, query: string) {
    return value.toLowerCase().includes(query);
}

export function RBACManagementPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [activeTab, setActiveTab] = useState<RBACTab>('roles');
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
    const [history, setHistory] = useState<RoleChangeHistoryType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewRole, setViewRole] = useState<Role | null>(null);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [diffChange, setDiffChange] = useState<RoleChangeHistoryType | null>(
        null,
    );

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getRoles(),
            getPermissions(),
            getRoleChangeHistory(),
            getUserRoleAssignments(),
        ])
            .then(
                ([
                    loadedRoles,
                    loadedPermissions,
                    loadedHistory,
                    loadedAssignments,
                ]) => {
                    if (!isCurrent) {
                        return;
                    }

                    setRoles(loadedRoles);
                    setPermissions(loadedPermissions);
                    setHistory(loadedHistory);
                    setAssignments(loadedAssignments);
                    setError(null);
                },
            )
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load RBAC management data.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setFeedback(null);
        }, 3200);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    const permissionById = useMemo(() => {
        return new Map(
            permissions.map((permission) => [permission.id, permission]),
        );
    }, [permissions]);

    const normalizedSearch = [searchQuery, topbarSearch]
        .map((query) => query.trim().toLowerCase())
        .filter(Boolean)
        .join(' ');

    const filteredRoles = useMemo(() => {
        if (!normalizedSearch) {
            return roles;
        }

        return roles.filter((role) =>
            matchesQuery(
                [
                    role.name,
                    role.description,
                    role.permissionIds
                        .map((permissionId) => permissionById.get(permissionId))
                        .filter(Boolean)
                        .map((permission) => permission?.name)
                        .join(' '),
                ].join(' '),
                normalizedSearch,
            ),
        );
    }, [normalizedSearch, permissionById, roles]);

    const filteredPermissions = useMemo(() => {
        if (!normalizedSearch) {
            return permissions;
        }

        return permissions.filter((permission) =>
            matchesQuery(
                [
                    permission.name,
                    permission.key,
                    permission.description,
                    permission.module,
                ].join(' '),
                normalizedSearch,
            ),
        );
    }, [normalizedSearch, permissions]);

    const filteredAssignments = useMemo(() => {
        if (!normalizedSearch) {
            return assignments;
        }

        return assignments.filter((assignment) => {
            const roleName =
                roles.find((role) => role.id === assignment.roleId)?.name ?? '';

            return matchesQuery(
                [
                    assignment.userName,
                    assignment.email,
                    assignment.agency,
                    roleName,
                    assignment.status,
                ]
                    .filter(Boolean)
                    .join(' '),
                normalizedSearch,
            );
        });
    }, [assignments, normalizedSearch, roles]);

    const stats = useMemo(() => {
        return {
            totalRoles: roles.length,
            systemRoles: roles.filter((role) => role.isSystemRole).length,
            totalPermissions: permissions.length,
            usersWithRoles: roles.reduce(
                (total, role) => total + role.userCount,
                0,
            ),
        };
    }, [permissions.length, roles]);

    const isRoleNameTaken = (name: string, currentRoleId?: string) =>
        roles.some(
            (role) =>
                role.name.toLowerCase() === name.trim().toLowerCase() &&
                role.id !== currentRoleId,
        );

    const recordHistory = async (
        payload: Omit<RoleChangeHistoryType, 'id' | 'date'>,
    ) => {
        const createdChange = await addRoleChangeHistory(payload);
        setHistory((currentHistory) => [createdChange, ...currentHistory]);
    };

    const handleCreateRole = async (payload: CreateRolePayload) => {
        setIsSaving(true);

        try {
            const createdRole = await createRole(payload);
            setRoles((currentRoles) => [createdRole, ...currentRoles]);
            await recordHistory({
                roleId: createdRole.id,
                roleName: createdRole.name,
                changedBy: 'Super Admin',
                changeType: 'role-created',
                after: getPermissionKeyDiff(createdRole.permissionIds),
                summary: `${createdRole.name} was created from the RBAC management module.`,
            });
            setIsCreateOpen(false);
            setFeedback(`${createdRole.name} has been created.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateRole = async (role: Role, payload: UpdateRolePayload) => {
        setIsSaving(true);

        try {
            const updatedRole = await updateRole(role.id, payload);
            setRoles((currentRoles) =>
                currentRoles.map((currentRole) =>
                    currentRole.id === updatedRole.id
                        ? updatedRole
                        : currentRole,
                ),
            );
            await recordHistory({
                roleId: updatedRole.id,
                roleName: updatedRole.name,
                changedBy: 'Super Admin',
                changeType:
                    role.permissionIds.join('|') ===
                    updatedRole.permissionIds.join('|')
                        ? 'role-modified'
                        : 'permission-updated',
                before: getPermissionKeyDiff(role.permissionIds),
                after: getPermissionKeyDiff(updatedRole.permissionIds),
                summary: `${updatedRole.name} was updated from RBAC Management.`,
            });
            setEditRole(null);
            setFeedback(`${updatedRole.name} has been updated.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDuplicateRole = async (role: Role) => {
        const baseName = `${role.name} Copy`;
        let duplicateName = baseName;
        let copyIndex = 2;

        while (isRoleNameTaken(duplicateName)) {
            duplicateName = `${baseName} ${copyIndex}`;
            copyIndex += 1;
        }

        await handleCreateRole({
            name: duplicateName,
            description: role.description,
            permissionIds: role.permissionIds,
        });
    };

    const handleDeleteRole = async (role: Role) => {
        setIsSaving(true);

        try {
            await deleteRole(role.id);
            setRoles((currentRoles) =>
                currentRoles.filter(
                    (currentRole) => currentRole.id !== role.id,
                ),
            );
            await recordHistory({
                roleId: role.id,
                roleName: role.name,
                changedBy: 'Super Admin',
                changeType: 'role-deleted',
                before: getPermissionKeyDiff(role.permissionIds),
                summary: `${role.name} was removed from RBAC Management.`,
            });
            setDeleteTarget(null);
            setFeedback(`${role.name} has been deleted.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeUserRole = async (assignment: UserRoleAssignment) => {
        const currentRoleIndex = roles.findIndex(
            (role) => role.id === assignment.roleId,
        );
        const nextRole =
            roles[(currentRoleIndex + 1) % Math.max(roles.length, 1)];

        if (!nextRole) {
            return;
        }

        if (
            nextRole.isSystemRole &&
            !window.confirm(
                `${nextRole.name} grants elevated permissions. Continue with this role change?`,
            )
        ) {
            return;
        }

        setIsSaving(true);

        try {
            const updatedAssignment = await updateUserRole(
                assignment.id,
                nextRole.id,
            );
            setAssignments((currentAssignments) =>
                currentAssignments.map((currentAssignment) =>
                    currentAssignment.id === updatedAssignment.id
                        ? updatedAssignment
                        : currentAssignment,
                ),
            );
            await recordHistory({
                roleId: nextRole.id,
                roleName: nextRole.name,
                changedBy: 'Super Admin',
                changeType: 'role-modified',
                summary: `${assignment.userName} was assigned to ${nextRole.name}.`,
            });
            setFeedback(`${assignment.userName} is now ${nextRole.name}.`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <RBACHeader onCreateRole={() => setIsCreateOpen(true)} />

                {error && (
                    <div className="mt-5 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                        {error}
                    </div>
                )}

                {feedback && (
                    <div className="mt-5 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
                        {feedback}
                    </div>
                )}

                <RBACStats {...stats} />

                <section className="mt-5 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                    <RBACTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    <div className="flex flex-col gap-3 border-b border-[#f3f4f6] px-4 py-4 sm:flex-row sm:px-6">
                        <div className="relative min-w-0 flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]"
                                aria-hidden="true"
                            />
                            <input
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                className="h-[42px] w-full rounded-[8px] border border-[#e5e7eb] bg-white pr-3 pl-10 text-sm text-[#1e2939] transition outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="Search roles, permissions, or users..."
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveTab('permissions')}
                            className="h-[42px] shrink-0 rounded-[8px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#1e2939] transition hover:bg-[#f9fafb]"
                        >
                            Permission Matrix
                        </button>
                    </div>

                    {activeTab === 'roles' && (
                        <RolesTable
                            roles={filteredRoles}
                            isLoading={isLoading}
                            onView={setViewRole}
                            onEdit={setEditRole}
                            onDuplicate={handleDuplicateRole}
                            onDelete={setDeleteTarget}
                        />
                    )}

                    {activeTab === 'permissions' && (
                        <PermissionsTab permissions={filteredPermissions} />
                    )}

                    {activeTab === 'assignments' && (
                        <UserRoleAssignmentsTab
                            assignments={filteredAssignments}
                            roles={roles}
                            onChangeRole={handleChangeUserRole}
                        />
                    )}
                </section>

                <RoleChangeHistory
                    changes={history}
                    onViewDiff={setDiffChange}
                />
            </main>

            <ViewRoleModal
                role={viewRole}
                permissions={permissions}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewRole(null);
                    }
                }}
            />
            <EditRoleModal
                role={editRole}
                permissions={permissions}
                isSaving={isSaving}
                isRoleNameTaken={isRoleNameTaken}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditRole(null);
                    }
                }}
                onSubmit={handleUpdateRole}
            />
            <CreateRoleModal
                key={isCreateOpen ? 'create-role-open' : 'create-role-closed'}
                open={isCreateOpen}
                permissions={permissions}
                isSaving={isSaving}
                isRoleNameTaken={isRoleNameTaken}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreateRole}
            />
            <DeleteRoleConfirmModal
                role={deleteTarget}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTarget(null);
                    }
                }}
                onConfirm={handleDeleteRole}
            />
            <RoleChangeDiffModal
                change={diffChange}
                onOpenChange={(open) => {
                    if (!open) {
                        setDiffChange(null);
                    }
                }}
            />
        </AdminLayout>
    );
}
