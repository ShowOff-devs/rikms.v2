import { useEffect, useMemo, useState } from 'react';
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
import type {
    AgencyAdminOption,
    CreateAgencyPayload,
    ManagedAgency,
    UpdateAgencyPayload,
} from '@/types/admin-agencies';

const rowsPerPage = 9;

function matchesSearch(agency: ManagedAgency, query: string) {
    return [
        agency.name,
        agency.shortName,
        agency.agencyAdmin?.fullName,
        agency.agencyAdmin?.email,
    ]
        .join(' ')
        .toLowerCase()
        .includes(query);
}

function isWithinUpdatedWindow(value: string, days: string) {
    if (days === 'all') {
        return true;
    }

    const windowMs = Number(days) * 24 * 60 * 60 * 1000;

    return Date.now() - new Date(value).getTime() <= windowMs;
}

export function AgencyManagementPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [agencies, setAgencies] = useState<ManagedAgency[]>([]);
    const [adminOptions, setAdminOptions] = useState<AgencyAdminOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedUpdated, setSelectedUpdated] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
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

        Promise.all([getAgencies(), getAgencyAdminOptions()])
            .then(([loadedAgencies, loadedAdminOptions]) => {
                if (!isCurrent) {
                    return;
                }

                setAgencies(loadedAgencies);
                setAdminOptions(loadedAdminOptions);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load agencies.');
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
    }, [searchQuery, selectedType, selectedStatus, selectedUpdated]);

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
        const activeAgencies = agencies.filter(
            (agency) => agency.status === 'active',
        ).length;
        const inactiveAgencies = agencies.length - activeAgencies;
        const totalResearchRecords = agencies.reduce(
            (total, agency) => total + agency.totalResearch,
            0,
        );

        return {
            totalAgencies: agencies.length,
            activeAgencies,
            inactiveAgencies,
            totalResearchRecords,
        };
    }, [agencies]);

    const filteredAgencies = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return agencies.filter((agency) => {
            const searchMatches =
                !normalizedSearch || matchesSearch(agency, normalizedSearch);
            const typeMatches =
                selectedType === 'all' || agency.type === selectedType;
            const statusMatches =
                selectedStatus === 'all' || agency.status === selectedStatus;
            const updatedMatches = isWithinUpdatedWindow(
                agency.lastUpdated,
                selectedUpdated,
            );

            return (
                searchMatches && typeMatches && statusMatches && updatedMatches
            );
        });
    }, [agencies, searchQuery, selectedType, selectedStatus, selectedUpdated]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredAgencies.length / rowsPerPage),
    );
    const paginatedAgencies = filteredAgencies.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
    );

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

        try {
            const createdAgency = await createAgency(payload);
            setAgencies((currentAgencies) => [
                createdAgency,
                ...currentAgencies,
            ]);
            await refreshAdminOptions();
            setIsCreateOpen(false);
            setFeedback(`${createdAgency.shortName} has been created.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateAgency = async (
        id: string,
        payload: UpdateAgencyPayload,
    ) => {
        setIsSaving(true);

        try {
            const updatedAgency = await updateAgency(id, payload);
            setAgencies((currentAgencies) =>
                currentAgencies.map((agency) =>
                    agency.id === id ? updatedAgency : agency,
                ),
            );
            await refreshAdminOptions();
            setEditAgency(null);
            setFeedback(`${updatedAgency.shortName} has been updated.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!statusAgency) {
            return;
        }

        setIsSaving(true);

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
            setStatusAgency(null);
            setFeedback(
                `${updatedAgency.shortName} is now ${updatedAgency.status}.`,
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignAgencyAdmin = async (
        agencyId: string,
        adminUserId: string,
    ) => {
        setIsSaving(true);

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
            await refreshAdminOptions();
            setAssignAgency(null);
            setFeedback(
                `${updatedAgency.shortName} agency admin has been updated.`,
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveAgency = async () => {
        if (!archiveTarget) {
            return;
        }

        setIsSaving(true);

        try {
            await archiveAgency(archiveTarget.id);
            setFeedback(
                `${archiveTarget.shortName} archive request was recorded.`,
            );
            setArchiveTarget(null);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <AgencyManagementHeader
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
                        agencies={paginatedAgencies}
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
                        totalResults={filteredAgencies.length}
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
                isNameTaken={isNameTaken}
                isShortNameTaken={isShortNameTaken}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreateAgency}
            />
            <EditAgencyModal
                agency={editAgency}
                adminOptions={adminOptions}
                isSaving={isSaving}
                isNameTaken={isNameTaken}
                isShortNameTaken={isShortNameTaken}
                onOpenChange={(open) => {
                    if (!open) {
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
