import type { ArchiveStatus } from '@/types/admin-archive';

export const archiveStatusLabels: Record<ArchiveStatus, string> = {
    archived: 'Archived',
    'pending-deletion': 'Pending Deletion',
    restored: 'Restored',
};

export const archiveRecordTypeLabels = {
    research: 'Research',
    agency: 'Agency',
    user: 'User',
} as const;
