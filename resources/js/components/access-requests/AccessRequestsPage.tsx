import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AccessRequestDecisionDialog } from '@/components/access-requests/AccessRequestDecisionDialog';
import { AccessRequestDetailsModal } from '@/components/access-requests/AccessRequestDetailsModal';
import { AccessRequestFilters } from '@/components/access-requests/AccessRequestFilters';
import { AccessRequestPagination } from '@/components/access-requests/AccessRequestPagination';
import { AccessRequestStats } from '@/components/access-requests/AccessRequestStats';
import { AccessRequestTable } from '@/components/access-requests/AccessRequestTable';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import {
    approveAccessRequest,
    denyAccessRequest,
    filterAccessRequests,
    getAccessRequests,
} from '@/lib/access-requests/access-request-service';
import { getAgencySession } from '@/lib/auth/agency-auth';
import type {
    AccessRequest,
    AccessRequestFilters as AccessRequestFiltersValue,
} from '@/types/access-request';
import type { AgencyAuthSession } from '@/types/auth';

type DecisionState = {
    request: AccessRequest;
    decision: 'approved' | 'denied';
};

const initialFilters: AccessRequestFiltersValue = {
    search: '',
    status: 'all',
    date: 'all',
    organization: 'all',
};

export function AccessRequestsPage() {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [filters, setFilters] =
        useState<AccessRequestFiltersValue>(initialFilters);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRequest, setSelectedRequest] =
        useState<AccessRequest | null>(null);
    const [decisionState, setDecisionState] = useState<DecisionState | null>(
        null,
    );
    const [denialReason, setDenialReason] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDecision, setIsSavingDecision] = useState(false);

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        let isCurrent = true;

        getAccessRequests().then((nextRequests) => {
            if (!isCurrent) {
                return;
            }

            setRequests(nextRequests);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, []);

    const filteredRequests = useMemo(
        () => filterAccessRequests(requests, filters),
        [requests, filters],
    );

    const organizations = useMemo(
        () =>
            Array.from(new Set(requests.map((request) => request.organization)))
                .filter(Boolean)
                .sort((first, second) => first.localeCompare(second)),
        [requests],
    );

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRequests.length / rowsPerPage),
    );

    const effectiveCurrentPage = Math.min(currentPage, totalPages);
    const pageStartIndex =
        filteredRequests.length === 0
            ? 0
            : (effectiveCurrentPage - 1) * rowsPerPage;
    const pageEndIndex = Math.min(
        pageStartIndex + rowsPerPage,
        filteredRequests.length,
    );
    const visibleStartIndex =
        filteredRequests.length === 0 ? 0 : pageStartIndex + 1;
    const paginatedRequests = filteredRequests.slice(
        pageStartIndex,
        pageEndIndex,
    );

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const updateFilters = (nextFilters: AccessRequestFiltersValue) => {
        setFilters(nextFilters);
        setCurrentPage(1);
    };

    const updateSearch = (search: string) => {
        updateFilters({ ...filters, search });
    };

    const openDecisionDialog = (
        request: AccessRequest,
        decision: DecisionState['decision'],
    ) => {
        if (request.status !== 'pending') {
            return;
        }

        setDecisionState({ request, decision });
        setDenialReason('');
        setFeedback('');
    };

    const handleDecisionConfirm = async () => {
        if (!decisionState) {
            return;
        }

        if (
            decisionState.decision === 'denied' &&
            denialReason.trim().length === 0
        ) {
            return;
        }

        setIsSavingDecision(true);

        const updatedRequest =
            decisionState.decision === 'approved'
                ? await approveAccessRequest(decisionState.request.id)
                : await denyAccessRequest(
                      decisionState.request.id,
                      denialReason.trim(),
                  );

        if (updatedRequest) {
            setRequests((current) =>
                current.map((request) =>
                    request.id === updatedRequest.id ? updatedRequest : request,
                ),
            );
            setSelectedRequest((current) =>
                current?.id === updatedRequest.id ? updatedRequest : current,
            );
            setFeedback(
                `${updatedRequest.requesterName}'s request was ${
                    updatedRequest.status === 'approved' ? 'approved' : 'denied'
                }.`,
            );
        }

        setDecisionState(null);
        setDenialReason('');
        setIsSavingDecision(false);
    };

    return (
        <>
            <Head title="Agency Access Requests" />

            <AgencyAdminLayout
                session={session}
                search={filters.search}
                onSearchChange={updateSearch}
            >
                <main className="px-4 py-8 lg:px-[47px]">
                    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
                        <section>
                            <h1 className="text-[24px] leading-9 font-bold text-[#1e3a8a]">
                                Access Requests
                            </h1>
                            <p className="text-sm leading-5 text-[#6b7280]">
                                Review and manage download access requests
                                submitted by users.
                            </p>
                        </section>

                        {isLoading ? (
                            <LoadingState />
                        ) : (
                            <>
                                <AccessRequestStats requests={requests} />

                                <AccessRequestFilters
                                    filters={filters}
                                    organizations={organizations}
                                    onFiltersChange={updateFilters}
                                    onClearFilters={() =>
                                        updateFilters(initialFilters)
                                    }
                                />

                                {feedback ? (
                                    <div
                                        role="status"
                                        className="rounded-[10px] border border-[#b9f8cf] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#008236]"
                                    >
                                        {feedback}
                                    </div>
                                ) : null}

                                <p className="text-sm leading-5 text-[#6a7282]">
                                    Showing {visibleStartIndex}-{pageEndIndex}{' '}
                                    of {filteredRequests.length} requests
                                </p>

                                <AccessRequestTable
                                    requests={paginatedRequests}
                                    onView={setSelectedRequest}
                                    onApprove={(request) =>
                                        openDecisionDialog(request, 'approved')
                                    }
                                    onDeny={(request) =>
                                        openDecisionDialog(request, 'denied')
                                    }
                                    footer={
                                        <AccessRequestPagination
                                            currentPage={effectiveCurrentPage}
                                            totalPages={totalPages}
                                            rowsPerPage={rowsPerPage}
                                            totalItems={filteredRequests.length}
                                            onPageChange={(page) =>
                                                setCurrentPage(
                                                    Math.min(
                                                        Math.max(page, 1),
                                                        totalPages,
                                                    ),
                                                )
                                            }
                                            onRowsPerPageChange={(nextRows) => {
                                                setRowsPerPage(nextRows);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    }
                                />
                            </>
                        )}
                    </div>
                </main>
            </AgencyAdminLayout>

            <AccessRequestDetailsModal
                request={selectedRequest}
                open={Boolean(selectedRequest)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedRequest(null);
                    }
                }}
                onApprove={(request) => openDecisionDialog(request, 'approved')}
                onDeny={(request) => openDecisionDialog(request, 'denied')}
            />

            <AccessRequestDecisionDialog
                request={decisionState?.request ?? null}
                decision={decisionState?.decision ?? null}
                open={Boolean(decisionState)}
                denialReason={denialReason}
                isLoading={isSavingDecision}
                onDenialReasonChange={setDenialReason}
                onOpenChange={(open) => {
                    if (!open && !isSavingDecision) {
                        setDecisionState(null);
                        setDenialReason('');
                    }
                }}
                onConfirm={handleDecisionConfirm}
            />
        </>
    );
}

function LoadingState() {
    return (
        <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[82px] animate-pulse rounded-[14px] bg-white"
                    />
                ))}
            </section>
            <div className="h-[92px] animate-pulse rounded-[14px] bg-white" />
            <div className="h-[512px] animate-pulse rounded-[14px] bg-white" />
        </>
    );
}
