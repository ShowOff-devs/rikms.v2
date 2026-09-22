import { useEffect, useState } from 'react';
import { AgencyDetailsModal } from '@/components/admin/agencies/AgencyDetailsModal';
import { AgencyFilters } from '@/components/admin/agencies/AgencyFilters';
import { AgencyManagementHeader } from '@/components/admin/agencies/AgencyManagementHeader';
import { AgencyPagination } from '@/components/admin/agencies/AgencyPagination';
import { AgencyStats } from '@/components/admin/agencies/AgencyStats';
import { AgencyStatusConfirmModal } from '@/components/admin/agencies/AgencyStatusConfirmModal';
import { AgencyTable } from '@/components/admin/agencies/AgencyTable';
import { ArchiveAgencyModal } from '@/components/admin/agencies/ArchiveAgencyModal';
import { AssignAgencyAdminModal } from '@/components/admin/agencies/AssignAgencyAdminModal';
import { CreateAgencyModal } from '@/components/admin/agencies/CreateAgencyModal';
import { EditAgencyModal } from '@/components/admin/agencies/EditAgencyModal';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
    activateAgency,
    archiveAgency,
    assignAgencyAdmin,
    createAgency,
    deactivateAgency,
    getAgencies,
    getAgencyAdminOptions,
    updateAgency,
} from '@/lib/admin/agencies-service';
import { apiMessage } from '@/lib/api-client';
import type {
    AgencyAdminOption,
    CreateAgencyPayload,
    ManagedAgency,
    UpdateAgencyPayload,
} from '@/types/admin-agencies';

const rowsPerPage = 9;

export function AgencyManagementPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [agencies, setAgencies] = useState<ManagedAgency[]>([]);
    const [adminOptions, setAdminOptions] = useState<AgencyAdminOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedUpdated, setSelectedUpdated] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [reloadVersion, setReloadVersion] = useState(0);
    const [stats, setStats] = useState({
        totalAgencies: 0,
        activeAgencies: 0,
        inactiveAgencies: 0,
        totalResearchRecords: 0,
    });
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [detailsAgency, setDetailsAgency] = useState<ManagedAgency | null>(
        null,
    );
    const [editAgency, setEditAgency] = useState<ManagedAgency | null>(null);
    const [statusAgency, setStatusAgency] = useState<ManagedAgency | null>(
        null,
    );
    const [assignAgency, setAssignAgency] = useState<ManagedAgency | null>(
        null,
    );
    const [archiveTarget, setArchiveTarget] = useState<ManagedAgency | null>(
        null,
    );

    const refreshAdminOptions = async () => {
        const loadedAdminOptions = await getAgencyAdminOptions();

        setAdminOptions(loadedAdminOptions);
    };

    useEffect(() => {
        let isCurrent = true;

        getAgencyAdminOptions()
            .then((loadedAdminOptions) => {
                if (isCurrent) {
                    setAdminOptions(loadedAdminOptions);
                }
            })
            .catch((error) => {
                if (isCurrent) {
                    setError(
                        apiMessage(
                            error,
                            'Unable to load agency administrator options.',
                        ),
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

            getAgencies({
                page: currentPage,
                perPage: rowsPerPage,
                keyword: [searchQuery, topbarSearch]
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .join(' '),
                type: selectedType,
                status: selectedStatus,
                updatedDays: selectedUpdated,
            })
                .then((result) => {
                    if (!isCurrent) {
                        return;
                    }

                    setAgencies(result.agencies);
                    setTotalPages(Math.max(1, result.pagination.last_page));
                    setTotalResults(result.pagination.total);
                    setStats(result.summary);
                    setError(null);
                })
                .catch((error) => {
                    if (isCurrent) {
                        setError(apiMessage(error, 'Unable to load agencies.'));
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
        selectedStatus,
        selectedType,
        selectedUpdated,
        topbarSearch,
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchQuery,
        selectedType,
        selectedStatus,
        selectedUpdated,
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

    const isNameTaken = (name: string, currentAgencyId?: string) =>
        agencies.some(
            (agency) =>
                agency.name.toLowerCase() === name.trim().toLowerCase() &&
                agency.id !== currentAgencyId,
        );

    const isShortNameTaken = (shortName: string, currentAgencyId?: string) =>
        agencies.some(
            (agency) =>
                agency.shortName.toLowerCase() ===
                    shortName.trim().toLowerCase() &&
                agency.id !== currentAgencyId,
        );

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedType('all');
        setSelectedStatus('all');
        setSelectedUpdated('all');
    };

    const handleCreateAgency = async (payload: CreateAgencyPayload) => {
        setIsSaving(true);
        setCreateError(null);
        setError(null);

        try {
            const createdAgency = await createAgency(payload);
            setCurrentPage(1);
            setReloadVersion((version) => version + 1);
            await refreshAdminOptions();
            setIsCreateOpen(false);
            setFeedback(`${createdAgency.shortName} has been created.`);
        } catch (error) {
            setCreateError(apiMessage(error, 'Unable to create agency.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateAgency = async (
        id: string,
        payload: UpdateAgencyPayload,
    ) => {
        setIsSaving(true);
        setEditError(null);
        setError(null);

        try {
            const updatedAgency = await updateAgency(id, payload);
            setReloadVersion((version) => version + 1);
            await refreshAdminOptions();
            setEditAgency(null);
            setFeedback(`${updatedAgency.shortName} has been updated.`);
        } catch (error) {
            setEditError(apiMessage(error, 'Unable to update agency.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!statusAgency) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const updatedAgency =
                statusAgency.status === 'active'
                    ? await deactivateAgency(statusAgency.id)
                    : await activateAgency(statusAgency.id);
            setAgencies((currentAgencies) =>
                currentAgencies.map((agency) =>
                    agency.id === updatedAgency.id ? updatedAgency : agency,
                ),
            );
            setReloadVersion((version) => version + 1);
            setStatusAgency(null);
            setFeedback(
                `${updatedAgency.shortName} is now ${updatedAgency.status}.`,
            );
        } catch (error) {
            setError(apiMessage(error, 'Unable to update agency status.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignAgencyAdmin = async (
        agencyId: string,
        adminUserId: string,
    ) => {
        setIsSaving(true);
        setError(null);

        try {
            const updatedAgency = await assignAgencyAdmin(
                agencyId,
                adminUserId,
            );
            setAgencies((currentAgencies) =>
                currentAgencies.map((agency) =>
                    agency.id === updatedAgency.id ? updatedAgency : agency,
                ),
            );
            setReloadVersion((version) => version + 1);
            await refreshAdminOptions();
            setAssignAgency(null);
            setFeedback(
                `${updatedAgency.shortName} agency admin has been updated.`,
            );
        } catch (error) {
            setError(apiMessage(error, 'Unable to assign agency admin.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveAgency = async () => {
        if (!archiveTarget) {
            return;
        }

        const target = archiveTarget;

        setIsSaving(true);
        setError(null);

        try {
            await archiveAgency(target.id);

            if (agencies.length === 1 && currentPage > 1) {
                setCurrentPage((page) => page - 1);
            } else {
                setReloadVersion((version) => version + 1);
            }

            await refreshAdminOptions();
            setArchiveTarget(null);
            setFeedback(`${target.shortName} has been archived.`);
        } catch (error) {
            setError(apiMessage(error, 'Unable to archive agency.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <AgencyManagementHeader
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

                <AgencyStats {...stats} />

                <section className="mt-5 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                    <AgencyFilters
                        searchQuery={searchQuery}
                        selectedType={selectedType}
                        selectedStatus={selectedStatus}
                        selectedUpdated={selectedUpdated}
                        onSearchChange={setSearchQuery}
                        onTypeChange={setSelectedType}
                        onStatusChange={setSelectedStatus}
                        onUpdatedChange={setSelectedUpdated}
                        onReset={handleResetFilters}
                    />

                    <AgencyTable
                        agencies={agencies}
                        isLoading={isLoading}
                        onView={setDetailsAgency}
                        onEdit={setEditAgency}
                        onToggleStatus={setStatusAgency}
                        onAssignAdmin={setAssignAgency}
                        onArchive={setArchiveTarget}
                    />

                    <AgencyPagination
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

            <CreateAgencyModal
                key={isCreateOpen ? 'create-open' : 'create-closed'}
                open={isCreateOpen}
                adminOptions={adminOptions}
                isSaving={isSaving}
                serverError={createError}
                isNameTaken={isNameTaken}
                isShortNameTaken={isShortNameTaken}
                onOpenChange={(open) => {
                    if (!open) {
                        setCreateError(null);
                    }

                    setIsCreateOpen(open);
                }}
                onSubmit={handleCreateAgency}
            />
            <EditAgencyModal
                agency={editAgency}
                adminOptions={adminOptions}
                isSaving={isSaving}
                serverError={editError}
                isNameTaken={isNameTaken}
                isShortNameTaken={isShortNameTaken}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditError(null);
                        setEditAgency(null);
                    }
                }}
                onSubmit={handleUpdateAgency}
            />
            <AgencyDetailsModal
                agency={detailsAgency}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailsAgency(null);
                    }
                }}
            />
            <AgencyStatusConfirmModal
                agency={statusAgency}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setStatusAgency(null);
                    }
                }}
                onConfirm={handleConfirmStatusChange}
            />
            <AssignAgencyAdminModal
                agency={assignAgency}
                adminOptions={adminOptions}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setAssignAgency(null);
                    }
                }}
                onSubmit={handleAssignAgencyAdmin}
            />
            <ArchiveAgencyModal
                agency={archiveTarget}
                isSaving={isSaving}
                onOpenChange={(open) => {
                    if (!open) {
                        setArchiveTarget(null);
                    }
                }}
                onConfirm={handleArchiveAgency}
            />
        </AdminLayout>
    );
}
