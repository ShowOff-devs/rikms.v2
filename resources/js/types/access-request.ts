export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export type EmailNotificationStatus = 'queued' | 'skipped' | 'failed_to_queue';

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
    internalNotes?: string;
    accessExpiresAt?: string;
    processedAt?: string;
    processedBy?: string;
};

export type AccessRequestFilters = {
    search: string;
    status: AccessRequestStatusFilter;
    date: AccessRequestDateFilter;
    organization: string;
};
