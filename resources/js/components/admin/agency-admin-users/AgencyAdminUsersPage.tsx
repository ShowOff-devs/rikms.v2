import { useEffect, useState } from 'react';
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
import { apiMessage } from '@/lib/api-client';
import type {
    Agency,
    AgencyAdminUser,
    CreateAgencyAdminUserPayload,
    UpdateAgencyAdminUserPayload,
} from '@/types/admin-users';

const rowsPerPage = 10;

export function AgencyAdminUsersPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [users, setUsers] = useState<AgencyAdminUser[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgency, setSelectedAgency] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedRole, setSelectedRole] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [reloadVersion, setReloadVersion] = useState(0);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        recentlyCreated: 0,
    });
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

        getAgencies()
            .then((loadedAgencies) => {
                if (isCurrent) {
                    setAgencies(loadedAgencies);
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    setError(
                        apiMessage(error, 'Unable to load active agencies.'),
                    );
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        let isCurrent = true;
        const timerId = window.setTimeout(() => {
            setIsLoading(true);

            getAgencyAdminUsers({
                page: currentPage,
                perPage: rowsPerPage,
                keyword: [searchQuery, topbarSearch]
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .join(' '),
                agencyId: selectedAgency,
                status: selectedStatus,
            })
                .then((result) => {
                    if (!isCurrent) {
                        return;
                    }

                    setUsers(result.users);
                    setTotalPages(Math.max(1, result.pagination.last_page));
                    setTotalResults(result.pagination.total);
                    setStats(result.summary);
                    setError(null);
                })
                .catch((error) => {
                    if (isCurrent) {
                        setError(
                            apiMessage(
                                error,
                                'Unable to load agency admin users.',
                            ),
                        );
                    }
                })
                .finally(() => {
                    if (isCurrent) {
                        setIsLoading(false);
                    }
                });
        }, 250);

        return () => {
            isCurrent = false;
            window.clearTimeout(timerId);
        };
    }, [
        currentPage,
        reloadVersion,
        searchQuery,
        selectedAgency,
        selectedStatus,
        topbarSearch,
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchQuery,
        selectedAgency,
        selectedStatus,
        selectedRole,
        topbarSearch,
    ]);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setFeedback(null);
        }, 3200);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

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
        setCreateError(null);
        setError(null);

        try {
            const created = await createAgencyAdminUser(payload);
            setCurrentPage(1);
            setReloadVersion((version) => version + 1);
            setIsCreateOpen(false);
            setFeedback(created.message);
        } catch (error) {
            setCreateError(apiMessage(error, 'Unable to create agency admin.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateUser = async (
        id: string,
        payload: UpdateAgencyAdminUserPayload,
    ) => {
        setIsSaving(true);
        setError(null);

        try {
            const updatedUser = await updateAgencyAdminUser(id, payload);
            setReloadVersion((version) => version + 1);
            setEditUser(null);
            setFeedback(`${updatedUser.fullName} has been updated.`);
        } catch (error) {
            setError(apiMessage(error, 'Unable to update agency admin.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!statusUser) {
            return;
        }

        setIsSaving(true);
        setError(null);

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
            setReloadVersion((version) => version + 1);
            setStatusUser(null);
            setFeedback(
                `${updatedUser.fullName} is now ${updatedUser.status}.`,
            );
        } catch (error) {
            setError(apiMessage(error, 'Unable to update account status.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmResetPassword = async () => {
        if (!resetUser) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await resetAgencyAdminPassword(resetUser.id);
            setFeedback(
                `Password reset instructions were sent to ${resetUser.email}.`,
            );
            setResetUser(null);
        } catch (error) {
            setError(apiMessage(error, 'Unable to send password reset.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmRemove = async () => {
        if (!removeUser) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await removeAgencyAdminUser(removeUser.id);

            if (users.length === 1 && currentPage > 1) {
                setCurrentPage((page) => page - 1);
            } else {
                setReloadVersion((version) => version + 1);
            }

            setFeedback(`${removeUser.fullName} has been removed.`);
            setRemoveUser(null);
        } catch (error) {
            setError(apiMessage(error, 'Unable to remove agency admin.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <AgencyAdminUsersHeader
                    onCreate={() => {
                        setCreateError(null);
                        setIsCreateOpen(true);
                    }}
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
                        users={users}
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
                        totalResults={totalResults}
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
                serverError={createError}
                isEmailTaken={isEmailTaken}
                onOpenChange={(open) => {
                    if (!open) {
                        setCreateError(null);
                    }

                    setIsCreateOpen(open);
                }}
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
