import { archiveRecordTypeLabels } from '@/data/mock-admin-archive';
import type { AdminArchivedRecord } from '@/types/admin-archive';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

export function getArchivedRecordTitle(record: AdminArchivedRecord) {
    if (record.type === 'research') {
        return record.title;
    }

    if (record.type === 'agency') {
        return record.name;
    }

    return record.fullName;
}

export function getArchivedRecordAgency(record: AdminArchivedRecord) {
    if (record.type === 'agency') {
        return record.shortName;
    }

    return record.agency;
}

export function getArchivedRecordTypeLabel(record: AdminArchivedRecord) {
    return archiveRecordTypeLabels[record.type];
}

export function formatArchivedRecordDate(value: string) {
    return dateFormatter.format(new Date(value));
}

export function getArchivedRecordDetails(record: AdminArchivedRecord) {
    const shared = [
        ['Record Type', getArchivedRecordTypeLabel(record)],
        ['Archived By', record.archivedBy],
        ['Archive Date', formatArchivedRecordDate(record.archiveDate)],
        ['Status', record.status],
    ];

    if (record.type === 'research') {
        return [
            ['Research Title', record.title],
            ['Agency', record.agency],
            ['Author/s', record.authors.join(', ')],
            ['Year', String(record.year)],
            ...shared,
        ];
    }

    if (record.type === 'agency') {
        return [
            ['Agency Name', record.name],
            ['Short Name', record.shortName],
            ['Agency Type', record.agencyType],
            ...shared,
        ];
    }

    return [
        ['User Name', record.fullName],
        ['Email', record.email],
        ['Role', record.role],
        ['Agency', record.agency ?? 'System'],
        ...shared,
    ];
}
