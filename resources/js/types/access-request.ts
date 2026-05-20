export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export type AccessRequestDateFilter = 'all' | 'march-2025' | 'february-2025';

export type AccessRequestStatusFilter = AccessRequestStatus | 'all';

export type AccessRequest = {
    id: string;
    requesterName: string;
    requesterEmail: string;
    organization: string;
    researchTitle: string;
    researchId: string;
    requestDate: string;
    status: AccessRequestStatus;
    requestMessage?: string;
    denialReason?: string;
    processedAt?: string;
    processedBy?: string;
};

export type AccessRequestFilters = {
    search: string;
    status: AccessRequestStatusFilter;
    date: AccessRequestDateFilter;
    organization: string;
};
