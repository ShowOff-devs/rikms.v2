import { useEffect, useMemo, useState } from 'react';
import { AgencyAdminUserDetailsModal } from '@/components/admin/agency-admin-users/AgencyAdminUserDetailsModal';
import { AgencyAdminUserFilters } from '@/components/admin/agency-admin-users/AgencyAdminUserFilters';
import { AgencyAdminUsersHeader } from '@/components/admin/agency-admin-users/AgencyAdminUsersHeader';
import { AgencyAdminUsersPagination } from '@/components/admin/agency-admin-users/AgencyAdminUsersPagination';
import { AgencyAdminUsersTable } from '@/components/admin/agency-admin-users/AgencyAdminUsersTable';
import { AgencyAdminUserStats } from '@/components/admin/agency-admin-users/AgencyAdminUserStats';
import { CreateAgencyAdminModal } from '@/components/admin/agency-admin-users/CreateAgencyAdminModal';
import { EditAgencyAdminModal } from '@/components/admin/agency-admin-users/EditAgencyAdminModal';
import { RemoveAgencyAdminModal } from '@/components/admin/agency-admin-users/RemoveAgencyAdminModal';
import { ResetPasswordModal } from '@/components/admin/agency-admin-users/ResetPasswordModal';
import { UserStatusConfirmModal } from '@/components/admin/agency-admin-users/UserStatusConfirmModal';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    activateAgencyAdminUser,
    createAgencyAdminUser,
    deactivateAgencyAdminUser,
    getAgencies,
    getAgencyAdminUsers,
    removeAgencyAdminUser,
    resetAgencyAdminPassword,
    updateAgencyAdminUser,
} from '@/lib/admin/agency-admin-users-service';
import type {
    Agency,
    AgencyAdminUser,
    CreateAgencyAdminUserPayload,
    UpdateAgencyAdminUserPayload,
} from '@/types/admin-users';

const rowsPerPage = 10;
const recentCreatedCutoff = new Date('2026-02-18T00:00:00+08:00').getTime();

function matchesSearch(user: AgencyAdminUser, query: string) {
    return [
        user.fullName,
        user.email,
        user.agencyName,
        user.agencyShortName,
        user.role,
    ]
        .join(' ')
        .toLowerCase()
        .includes(query);
}

export function AgencyAdminUsersPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [users, setUsers] = useState<AgencyAdminUser[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgency, setSelectedAgency] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedRole, setSelectedRole] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [detailsUser, setDetailsUser] = useState<AgencyAdminUser | null>(
        null,
    );
    const [editUser, setEditUser] = useState<AgencyAdminUser | null>(null);
    const [statusUser, setStatusUser] = useState<AgencyAdminUser | null>(null);
    const [resetUser, setResetUser] = useState<AgencyAdminUser | null>(null);
    const [removeUser, setRemoveUser] = useState<AgencyAdminUser | null>(null);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([getAgencyAdminUsers(), getAgencies()])
            .then(([loadedUsers, loadedAgencies]) => {
                if (!isCurrent) {
                    return;
                }

                setUsers(loadedUsers);
                setAgencies(loadedAgencies);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load agency admin users.');
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
        setCurrentPage(1);
    }, [searchQuery, selectedAgency, selectedStatus, selectedRole]);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setFeedback(null);
        }, 3200);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    const stats = useMemo(() => {
        const activeUsers = users.filter(
            (user) => user.status === 'active',
        ).length;
        const inactiveUsers = users.length - activeUsers;
        const recentlyCreated = users.filter(
            (user) => new Date(user.createdAt).getTime() >= recentCreatedCutoff,
        ).length;

        return {
            totalUsers: users.length,
            activeUsers,
            inactiveUsers,
            recentlyCreated,
        };
    }, [users]);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return users.filter((user) => {
            const searchMatches =
                !normalizedSearch || matchesSearch(user, normalizedSearch);
            const agencyMatches =
                selectedAgency === 'all' || user.agencyId === selectedAgency;
            const statusMatches =
                selectedStatus === 'all' || user.status === selectedStatus;
            const roleMatches =
                selectedRole === 'all' ||
                (selectedRole === 'agency-admin' &&
                    user.role === 'Agency Admin');

            return (
                searchMatches &&
                agencyMatches &&
                statusMatches &&
                roleMatches
            );
        });
    }, [users, searchQuery, selectedAgency, selectedStatus, selectedRole]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
    );

    const isEmailTaken = (email: string, currentUserId?: string) =>
        users.some(
            (user) =>
                user.email.toLowerCase() === email.trim().toLowerCase() &&
                user.id !== currentUserId,
        );

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedAgency('all');
        setSelectedStatus('all');
        setSelectedRole('all');
    };

    const handleCreateUser = async (payload: CreateAgencyAdminUserPayload) => {
        setIsSaving(true);

        try {
            const createdUser = await createAgencyAdminUser(payload);
            setUsers((currentUsers) => [createdUser, ...currentUsers]);
            setIsCreateOpen(false);
            setFeedback(`${createdUser.fullName} has been created.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateUser = async (
        id: string,
        payload: UpdateAgencyAdminUserPayload,
    ) => {
        setIsSaving(true);

        try {
            const updatedUser = await updateAgencyAdminUser(id, payload);
            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user.id === id ? updatedUser : user,
                ),
            );
            setEditUser(null);
            setFeedback(`${updatedUser.fullName} has been updated.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!statusUser) {
            return;
        }

        setIsSaving(true);

        try {
            const updatedUser =
                statusUser.status === 'active'
                    ? await deactivateAgencyAdminUser(statusUser.id)
                    : await activateAgencyAdminUser(statusUser.id);
            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user.id === updatedUser.id ? updatedUser : user,
                ),
            );
            setStatusUser(null);
            setFeedback(
                `${updatedUser.fullName} is now ${updatedUser.status}.`,
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmResetPassword = async () => {
        if (!resetUser) {
            return;
        }

        setIsSaving(true);

        try {
            await resetAgencyAdminPassword(resetUser.id);
            setFeedback(`Password reset instructions were sent to ${resetUser.email}.`);
            setResetUser(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmRemove = async () => {
        if (!removeUser) {
            return;
        }

        setIsSaving(true);

        try {
            await removeAgencyAdminUser(removeUser.id);
            setUsers((currentUsers) =>
                currentUsers.filter((user) => user.id !== removeUser.id),
            );
            setFeedback(`${removeUser.fullName} has been removed.`);
            setRemoveUser(null);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <AgencyAdminUsersHeader
                    onCreate={() => setIsCreateOpen(true)}
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

                <AgencyAdminUserStats {...stats} />

                <section className="mt-5 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                    <AgencyAdminUserFilters
                        agencies={agencies}
                        searchQuery={searchQuery}
                        selectedAgency={selectedAgency}
                        selectedStatus={selectedStatus}
                        selectedRole={selectedRole}
                        onSearchChange={setSearchQuery}
                        onAgencyChange={setSelectedAgency}
                        onStatusChange={setSelectedStatus}
                        onRoleChange={setSelectedRole}
                        onReset={handleResetFilters}
                    />

                    <AgencyAdminUsersTable
                        users={paginatedUsers}
                        isLoading={isLoading}
                        onView={setDetailsUser}
                        onEdit={setEditUser}
                        onToggleStatus={setStatusUser}
                        onResetPassword={setResetUser}
                        onRemove={setRemoveUser}
                    />

                    <AgencyAdminUsersPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalResults={filteredUsers.length}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(page) =>
                            setCurrentPage(
                                Math.min(Math.max(page, 1), totalPages),
                            )
                        }
                    />
                </section>
            </main>

            <CreateAgencyAdminModal
                key={isCreateOpen ? 'create-open' : 'create-closed'}
                open={isCreateOpen}
                agencies={agencies}
                isSaving={isSaving}
                isEmailTaken={isEmailTaken}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreateUser}
            />
            <EditAgencyAdminModal
                user={editUser}
                agencies={agencies}
                isSaving={isSaving}
                isEmailTaken={isEmailTaken}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditUser(null);
                    }
                }}
                onSubmit={handleUpdateUser}
            />
            <AgencyAdminUserDetailsModal
                user={detailsUser}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailsUser(null);
                    }
                }}
            />
            <UserStatusConfirmModal
                user={statusUser}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setStatusUser(null);
                    }
                }}
                onConfirm={handleConfirmStatusChange}
            />
            <ResetPasswordModal
                user={resetUser}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setResetUser(null);
                    }
                }}
                onConfirm={handleConfirmResetPassword}
            />
            <RemoveAgencyAdminModal
                user={removeUser}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setRemoveUser(null);
                    }
                }}
                onConfirm={handleConfirmRemove}
            />
        </AdminLayout>
    );
}
