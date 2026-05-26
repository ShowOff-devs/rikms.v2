import {
    mockAdminArchiveSummary,
    mockArchiveActivityTimeline,
    mockArchivedAgencyRecords,
    mockArchivedResearchRecords,
    mockArchivedUserRecords,
} from '@/data/mock-admin-archive';
import type {
    AdminArchiveSummary,
    AdminArchivedRecord,
    ArchiveActivity,
    ArchiveExportOptions,
    ArchiveRecordType,
    ArchivedAgencyRecord,
    ArchivedResearchRecord,
    ArchivedUserRecord,
    GeneratedArchiveReport,
} from '@/types/admin-archive';

const mockNetworkDelay = (duration = 180) =>
    new Promise<void>((resolve) => {
        if (typeof window === 'undefined') {
            resolve();

            return;
        }

        window.setTimeout(resolve, duration);
    });

const cloneResearchRecord = (
    record: ArchivedResearchRecord,
): ArchivedResearchRecord => ({
    ...record,
    authors: [...record.authors],
});

const cloneAgencyRecord = (
    record: ArchivedAgencyRecord,
): ArchivedAgencyRecord => ({
    ...record,
});

const cloneUserRecord = (record: ArchivedUserRecord): ArchivedUserRecord => ({
    ...record,
});

const cloneActivity = (activity: ArchiveActivity): ArchiveActivity => ({
    ...activity,
});

export function createArchiveActivity(
    type: ArchiveActivity['type'],
    record: AdminArchivedRecord,
    performedBy = 'Super Admin',
): ArchiveActivity {
    return {
        id: `admin-archive-activity-${Date.now()}`,
        type,
        title:
            record.type === 'research'
                ? record.title
                : record.type === 'agency'
                  ? record.name
                  : record.fullName,
        recordType: record.type,
        performedBy,
        agency: record.type === 'agency' ? record.shortName : record.agency,
        timestamp: new Date().toISOString(),
    };
}

export async function getAdminArchiveSummary(): Promise<AdminArchiveSummary> {
    await mockNetworkDelay();

    return { ...mockAdminArchiveSummary };
}

export async function getArchivedResearchRecords(): Promise<
    ArchivedResearchRecord[]
> {
    await mockNetworkDelay();

    return mockArchivedResearchRecords.map(cloneResearchRecord);
}

export async function getArchivedAgencyRecords(): Promise<
    ArchivedAgencyRecord[]
> {
    await mockNetworkDelay();

    return mockArchivedAgencyRecords.map(cloneAgencyRecord);
}

export async function getArchivedUserRecords(): Promise<ArchivedUserRecord[]> {
    await mockNetworkDelay();

    return mockArchivedUserRecords.map(cloneUserRecord);
}

export async function getArchiveActivityTimeline(): Promise<ArchiveActivity[]> {
    await mockNetworkDelay();

    return mockArchiveActivityTimeline.map(cloneActivity);
}

export async function restoreArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; restoredAt: string }> {
    await mockNetworkDelay(420);

    return {
        recordType,
        id,
        restoredAt: new Date().toISOString(),
    };
}

export async function permanentlyDeleteArchivedRecord(
    recordType: ArchiveRecordType,
    id: string,
): Promise<{ recordType: ArchiveRecordType; id: string; deletedAt: string }> {
    await mockNetworkDelay(460);

    return {
        recordType,
        id,
        deletedAt: new Date().toISOString(),
    };
}

export async function exportArchiveReport(
    options: ArchiveExportOptions,
): Promise<GeneratedArchiveReport> {
    await mockNetworkDelay(900);

    const generatedAt = new Date().toISOString();
    const extension = options.format === 'excel' ? 'xlsx' : options.format;

    return {
        id: `archive-report-${Date.now()}`,
        fileName: `rikms-archive-report-${generatedAt.slice(0, 10)}.${extension}`,
        format: options.format,
        generatedAt,
        status: 'ready',
    };
}
