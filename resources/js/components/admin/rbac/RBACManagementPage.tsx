import { usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ChangeUserRoleModal } from '@/components/admin/rbac/ChangeUserRoleModal';
import { CreateAdminAccountModal } from '@/components/admin/rbac/CreateAdminAccountModal';
import { CreateRoleModal } from '@/components/admin/rbac/CreateRoleModal';
import { DeleteRoleConfirmModal } from '@/components/admin/rbac/DeleteRoleConfirmModal';
import { EditRoleModal } from '@/components/admin/rbac/EditRoleModal';
import { PermissionsTab } from '@/components/admin/rbac/PermissionsTab';
import { RBACHeader } from '@/components/admin/rbac/RBACHeader';
import { RbacPagination } from '@/components/admin/rbac/RbacPagination';
import { RBACStats } from '@/components/admin/rbac/RBACStats';
import { RBACTabs } from '@/components/admin/rbac/RBACTabs';
import type { RBACTab } from '@/components/admin/rbac/RBACTabs';
import { RoleChangeDiffModal } from '@/components/admin/rbac/RoleChangeDiffModal';
import { RoleChangeHistory } from '@/components/admin/rbac/RoleChangeHistory';
import { RolesTable } from '@/components/admin/rbac/RolesTable';
import { UserRoleAssignmentDetailsModal } from '@/components/admin/rbac/UserRoleAssignmentDetailsModal';
import { UserRoleAssignmentsTab } from '@/components/admin/rbac/UserRoleAssignmentsTab';
import { ViewRoleModal } from '@/components/admin/rbac/ViewRoleModal';
import { getAgencies } from '@/lib/admin/agency-admin-users-service';
import {
    createRole,
    createAdminAccount,
    deleteRole,
    getPermissions,
    getRoleChangeHistory,
    getRoleById,
    getRoles,
    getUserRoleAssignments,
    reactivateAdminAccount,
    resendAdminInvitation,
    revokeAdminAccountSessions,
    suspendAdminAccount,
    updateRole,
    updateUserRole,
} from '@/lib/admin/rbac-service';
import { apiMessage } from '@/lib/api-client';
import type { Agency } from '@/types/admin-users';
import type {
    CreateRolePayload,
    CreateAdminAccountPayload,
    Permission,
    Role,
    RoleChangeHistory as RoleChangeHistoryType,
    UpdateRolePayload,
    UserRoleAssignment,
} from '@/types/rbac';

function matchesQuery(value: string, query: string) {
    return value.toLowerCase().includes(query);
}

const historyRowsPerPage = 8;
const roleRowsPerPage = 10;

export function RBACManagementPage() {
    const { auth } = usePage().props;
    const adminPermissions = auth.adminPermissions ?? [];
    const isSuperAdmin = adminPermissions.includes('*');
    const canManageRbac =
        isSuperAdmin || adminPermissions.includes('rbac.manage');
    const canManageRoles =
        isSuperAdmin || adminPermissions.includes('roles.manage');
    const [topbarSearch, setTopbarSearch] = useState('');
    const [activeTab, setActiveTab] = useState<RBACTab>('roles');
    const [roles, setRoles] = useState<Role[]>([]);
    const [rolePage, setRolePage] = useState(1);
    const [roleScopeFilter, setRoleScopeFilter] = useState('all');
    const [roleStatusFilter, setRoleStatusFilter] = useState('all');
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
    const [assignmentPage, setAssignmentPage] = useState(1);
    const [assignmentTotalPages, setAssignmentTotalPages] = useState(1);
    const [assignmentTotal, setAssignmentTotal] = useState(0);
    const [assignmentRowsPerPage, setAssignmentRowsPerPage] = useState(15);
    const [history, setHistory] = useState<RoleChangeHistoryType[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showActiveAssignmentsOnly, setShowActiveAssignmentsOnly] =
        useState(false);
    const [viewRole, setViewRole] = useState<Role | null>(null);
    const [viewAssignment, setViewAssignment] =
        useState<UserRoleAssignment | null>(null);
    const [changeAssignment, setChangeAssignment] =
        useState<UserRoleAssignment | null>(null);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [diffChange, setDiffChange] = useState<RoleChangeHistoryType | null>(
        null,
    );
    const normalizedSearch = [searchQuery, topbarSearch]
        .map((query) => query.trim().toLowerCase())
        .filter(Boolean)
        .join(' ');

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
                    loadedAssignmentPage,
                ]) => {
                    if (!isCurrent) {
                        return;
                    }

                    setRoles(loadedRoles);
                    setPermissions(loadedPermissions);
                    setHistory(loadedHistory);
                    setAssignments(loadedAssignmentPage.assignments);
                    setAssignmentPage(
                        loadedAssignmentPage.pagination.currentPage,
                    );
                    setAssignmentTotalPages(
                        loadedAssignmentPage.pagination.lastPage,
                    );
                    setAssignmentTotal(loadedAssignmentPage.pagination.total);
                    setAssignmentRowsPerPage(
                        loadedAssignmentPage.pagination.perPage,
                    );
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
        getAgencies()
            .then(setAgencies)
            .catch(() => setAgencies([]));
    }, []);

    useEffect(() => {
        if (activeTab !== 'assignments') {
            return;
        }

        const timerId = window.setTimeout(() => {
            getUserRoleAssignments({
                page: assignmentPage,
                perPage: assignmentRowsPerPage,
                query: normalizedSearch,
                activeOnly: showActiveAssignmentsOnly,
            })
                .then((result) => {
                    setAssignments(result.assignments);
                    setAssignmentTotalPages(result.pagination.lastPage);
                    setAssignmentTotal(result.pagination.total);
                    setError(null);
                })
                .catch((caughtError) => {
                    setError(
                        apiMessage(
                            caughtError,
                            'Unable to load user role assignments.',
                        ),
                    );
                });
        }, 250);

        return () => window.clearTimeout(timerId);
    }, [
        activeTab,
        assignmentPage,
        assignmentRowsPerPage,
        normalizedSearch,
        showActiveAssignmentsOnly,
    ]);

    useEffect(() => {
        setAssignmentPage(1);
    }, [normalizedSearch, showActiveAssignmentsOnly]);

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

    const filteredRoles = useMemo(() => {
        if (!normalizedSearch) {
            return roles;
        }

        return roles.filter((role) => {
            if (
                roleScopeFilter !== 'all' &&
                role.accessScope !== roleScopeFilter
            ) {
                return false;
            }

            if (
                roleStatusFilter !== 'all' &&
                String(role.isActive) !== roleStatusFilter
            ) {
                return false;
            }

            return matchesQuery(
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
            );
        });
    }, [
        normalizedSearch,
        permissionById,
        roleScopeFilter,
        roleStatusFilter,
        roles,
    ]);

    const roleTotalPages = Math.max(
        1,
        Math.ceil(filteredRoles.length / roleRowsPerPage),
    );
    const effectiveRolePage = Math.min(rolePage, roleTotalPages);
    const paginatedRoles = filteredRoles.slice(
        (effectiveRolePage - 1) * roleRowsPerPage,
        effectiveRolePage * roleRowsPerPage,
    );

    useEffect(() => {
        setRolePage(1);
    }, [normalizedSearch, roleScopeFilter, roleStatusFilter]);

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

    const historyTotalPages = Math.max(
        1,
        Math.ceil(history.length / historyRowsPerPage),
    );
    const effectiveHistoryPage = Math.min(historyPage, historyTotalPages);
    const paginatedHistory = history.slice(
        (effectiveHistoryPage - 1) * historyRowsPerPage,
        effectiveHistoryPage * historyRowsPerPage,
    );

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

    const viewAssignmentRole = useMemo(
        () => roles.find((role) => role.id === viewAssignment?.roleId),
        [roles, viewAssignment],
    );

    const isRoleNameTaken = (name: string, currentRoleId?: string) =>
        roles.some(
            (role) =>
                role.name.toLowerCase() === name.trim().toLowerCase() &&
                role.id !== currentRoleId,
        );

    const handleViewRole = async (role: Role) => {
        try {
            setViewRole((await getRoleById(role.id)) ?? role);
            setError(null);
        } catch (caughtError) {
            setError(apiMessage(caughtError, 'Unable to load role details.'));
        }
    };

    const refreshHistory = async () => {
        const loadedHistory = await getRoleChangeHistory();
        setHistory(loadedHistory);
    };

    const handleCreateRole = async (payload: CreateRolePayload) => {
        setIsSaving(true);

        try {
            const createdRole = await createRole(payload);
            setRoles((currentRoles) => [createdRole, ...currentRoles]);
            await refreshHistory();
            setIsCreateOpen(false);
            setFeedback(`${createdRole.name} has been created.`);
            setError(null);
        } catch (caughtError) {
            setError(apiMessage(caughtError, 'Unable to create the role.'));
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
            await refreshHistory();
            setEditRole(null);
            setFeedback(`${updatedRole.name} has been updated.`);
            setError(null);
        } catch (caughtError) {
            setError(apiMessage(caughtError, 'Unable to update the role.'));
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
            slug: `${role.slug}_copy_${Date.now()}`,
            description: role.description,
            accessScope: role.accessScope,
            isActive: role.isActive,
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
            await refreshHistory();
            setDeleteTarget(null);
            setFeedback(`${role.name} has been deleted.`);
            setError(null);
        } catch (caughtError) {
            setError(apiMessage(caughtError, 'Unable to delete the role.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeUserRole = async (
        assignment: UserRoleAssignment,
        roleId: string,
    ) => {
        setIsSaving(true);

        try {
            const updatedAssignment = await updateUserRole(
                assignment.id,
                roleId,
            );
            setAssignments((currentAssignments) =>
                currentAssignments.map((currentAssignment) =>
                    currentAssignment.id === updatedAssignment.id
                        ? updatedAssignment
                        : currentAssignment,
                ),
            );
            await refreshHistory();
            setChangeAssignment(null);
            const roleName = roles.find((role) => role.id === roleId)?.name;
            setFeedback(
                `${assignment.userName} is now ${roleName ?? 'assigned'}.`,
            );
            setError(null);
        } catch (caughtError) {
            setError(
                apiMessage(caughtError, 'Unable to change the user role.'),
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateAdminAccount = async (
        payload: CreateAdminAccountPayload,
    ) => {
        setIsSaving(true);

        try {
            const createdAssignment = await createAdminAccount(payload);
            setAssignments((currentAssignments) => [
                createdAssignment,
                ...currentAssignments,
            ]);
            setRoles((currentRoles) =>
                currentRoles.map((role) =>
                    role.id === createdAssignment.roleId
                        ? { ...role, userCount: role.userCount + 1 }
                        : role,
                ),
            );
            setAssignmentTotal((total) => total + 1);
            setIsCreateAccountOpen(false);
            setActiveTab('assignments');
            setFeedback(
                `${createdAssignment.userName}'s account was created and the activation invitation was requested.`,
            );
            setError(null);
        } catch (caughtError) {
            setError(
                apiMessage(caughtError, 'Unable to create the admin account.'),
            );
        } finally {
            setIsSaving(false);
        }
    };

    const replaceAssignment = (updated: UserRoleAssignment) => {
        setAssignments((current) =>
            current.map((assignment) =>
                assignment.id === updated.id ? updated : assignment,
            ),
        );
    };

    const handleResendInvitation = async (assignment: UserRoleAssignment) => {
        setIsSaving(true);

        try {
            await resendAdminInvitation(assignment.id);
            setFeedback(`A new invitation was sent to ${assignment.email}.`);
            setError(null);
        } catch (caughtError) {
            setError(apiMessage(caughtError, 'Unable to resend invitation.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleAccountStatus = async (
        assignment: UserRoleAssignment,
    ) => {
        const suspending = assignment.status === 'active';
        const confirmed = window.confirm(
            suspending
                ? `Suspend ${assignment.userName} and revoke all active sessions?`
                : `Reactivate ${assignment.userName}?`,
        );

        if (!confirmed) {
return;
}

        setIsSaving(true);

        try {
            const updated = suspending
                ? await suspendAdminAccount(assignment.id)
                : await reactivateAdminAccount(assignment.id);
            replaceAssignment(updated);
            setFeedback(
                `${assignment.userName} was ${suspending ? 'suspended' : 'reactivated'}.`,
            );
            setError(null);
        } catch (caughtError) {
            setError(
                apiMessage(caughtError, 'Unable to update account status.'),
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevokeSessions = async (assignment: UserRoleAssignment) => {
        if (
            !window.confirm(`Revoke all sessions for ${assignment.userName}?`)
        ) {
            return;
        }

        setIsSaving(true);

        try {
            await revokeAdminAccountSessions(assignment.id);
            setFeedback(`${assignment.userName}'s sessions were revoked.`);
            setError(null);
        } catch (caughtError) {
            setError(apiMessage(caughtError, 'Unable to revoke sessions.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <RBACHeader
                    onCreateRole={() => setIsCreateOpen(true)}
                    onCreateAccount={() => setIsCreateAccountOpen(true)}
                    canCreateRole={canManageRoles}
                    canCreateAccount={canManageRbac}
                />

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
                        {activeTab === 'assignments' && (
                            <label className="flex h-[42px] shrink-0 items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#1e2939]">
                                <input
                                    type="checkbox"
                                    checked={showActiveAssignmentsOnly}
                                    onChange={(event) =>
                                        setShowActiveAssignmentsOnly(
                                            event.target.checked,
                                        )
                                    }
                                    className="size-4 rounded border-[#d1d5dc] text-[#1e3a8a] accent-[#1e3a8a]"
                                />
                                Active users only
                            </label>
                        )}
                        {activeTab === 'roles' && (
                            <>
                                <select
                                    value={roleScopeFilter}
                                    onChange={(event) =>
                                        setRoleScopeFilter(event.target.value)
                                    }
                                    className="h-[42px] rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm"
                                    aria-label="Filter roles by scope"
                                >
                                    <option value="all">All scopes</option>
                                    <option value="system">System-wide</option>
                                    <option value="agency">
                                        Agency scoped
                                    </option>
                                </select>
                                <select
                                    value={roleStatusFilter}
                                    onChange={(event) =>
                                        setRoleStatusFilter(event.target.value)
                                    }
                                    className="h-[42px] rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm"
                                    aria-label="Filter roles by status"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </>
                        )}
                    </div>

                    {activeTab === 'roles' && (
                        <RolesTable
                            roles={paginatedRoles}
                            isLoading={isLoading}
                            onView={handleViewRole}
                            onEdit={setEditRole}
                            onDuplicate={handleDuplicateRole}
                            onDelete={setDeleteTarget}
                            canManage={canManageRoles}
                        />
                    )}

                    {activeTab === 'roles' && (
                        <RbacPagination
                            currentPage={effectiveRolePage}
                            totalPages={roleTotalPages}
                            totalResults={filteredRoles.length}
                            rowsPerPage={roleRowsPerPage}
                            onPageChange={setRolePage}
                        />
                    )}

                    {activeTab === 'permissions' && (
                        <PermissionsTab permissions={filteredPermissions} />
                    )}

                    {activeTab === 'assignments' && (
                        <UserRoleAssignmentsTab
                            assignments={assignments}
                            roles={roles}
                            onView={setViewAssignment}
                            onChangeRole={setChangeAssignment}
                            onResendInvite={handleResendInvitation}
                            onToggleStatus={handleToggleAccountStatus}
                            onRevokeSessions={handleRevokeSessions}
                            isSaving={isSaving}
                            canManage={canManageRbac}
                        />
                    )}

                    {activeTab === 'assignments' && (
                        <RbacPagination
                            currentPage={assignmentPage}
                            totalPages={assignmentTotalPages}
                            totalResults={assignmentTotal}
                            rowsPerPage={assignmentRowsPerPage}
                            onPageChange={(page) =>
                                setAssignmentPage(
                                    Math.min(
                                        Math.max(page, 1),
                                        assignmentTotalPages,
                                    ),
                                )
                            }
                        />
                    )}
                </section>

                <RoleChangeHistory
                    changes={paginatedHistory}
                    currentPage={effectiveHistoryPage}
                    totalPages={historyTotalPages}
                    totalResults={history.length}
                    rowsPerPage={historyRowsPerPage}
                    onPageChange={(page) =>
                        setHistoryPage(
                            Math.min(Math.max(page, 1), historyTotalPages),
                        )
                    }
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
            <UserRoleAssignmentDetailsModal
                assignment={viewAssignment}
                role={viewAssignmentRole}
                permissions={permissions}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewAssignment(null);
                    }
                }}
            />
            <ChangeUserRoleModal
                key={changeAssignment?.id ?? 'change-role-closed'}
                assignment={changeAssignment}
                roles={roles}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setChangeAssignment(null);
                    }
                }}
                onSubmit={handleChangeUserRole}
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
            <CreateAdminAccountModal
                key={
                    isCreateAccountOpen
                        ? 'create-admin-open'
                        : 'create-admin-closed'
                }
                open={isCreateAccountOpen}
                roles={roles}
                permissions={permissions}
                agencies={agencies}
                isSaving={isSaving}
                onOpenChange={setIsCreateAccountOpen}
                onSubmit={handleCreateAdminAccount}
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
