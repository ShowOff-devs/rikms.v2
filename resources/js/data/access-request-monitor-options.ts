import type { AccessRequestStatus } from '@/types/access-request-monitor';

export const accessRequestStatusLabels: Record<AccessRequestStatus, string> = {
    approved: 'Approved',
    pending: 'Pending',
    denied: 'Denied',
};
