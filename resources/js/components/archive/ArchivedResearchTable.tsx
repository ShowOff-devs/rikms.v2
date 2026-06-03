import { Archive } from 'lucide-react';
import { archiveDocumentTypeLabels } from '@/data/archive-display';
import type { ArchivedResearch } from '@/types/archive';
import { ArchivedResearchActions } from './ArchivedResearchActions';
import { ArchiveEmptyState } from './ArchiveEmptyState';

type ArchivedResearchTableProps = {
    records: ArchivedResearch[];
    isLoading: boolean;
    onRestore: (record: ArchivedResearch) => void;
    onDelete: (record: ArchivedResearch) => void;
    onClearFilters: () => void;
};

const headers = [
    'Research Title',
    'Authors',
    'Year',
    'Archive Date',
    'Archived By',
    'Status',
    'Actions',
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

function formatArchiveDate(date: string) {
    return dateFormatter.format(new Date(date));
}

function formatAuthors(authors: string[]) {
    if (authors.length <= 1) {
        return authors[0] ?? 'Unknown';
    }

    return `${authors[0]} +${authors.length - 1}`;
}

export function ArchivedResearchTable({
    records,
    isLoading,
    onRestore,
    onDelete,
    onClearFilters,
}: ArchivedResearchTableProps) {
    if (isLoading) {
        return (
            <div className="p-6">
                <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, index) => (
                        <div
                            key={index}
                            className="h-[43px] animate-pulse rounded-[10px] bg-[#f3f4f6]"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (records.length === 0) {
        return <ArchiveEmptyState onClearFilters={onClearFilters} />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed">
                <colgroup>
                    <col className="w-[27%]" />
                    <col className="w-[15%]" />
                    <col className="w-[7%]" />
                    <col className="w-[11%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                </colgroup>
                <thead>
                    <tr className="h-[40.5px] border-b border-[#f3f4f6] bg-[#f9fafb]">
                        {headers.map((header) => (
                            <th
                                key={header}
                                scope="col"
                                className={`px-4 py-3 text-left text-xs leading-4 font-medium text-[#6a7282] ${
                                    header === 'Research Title' ? 'pl-6' : ''
                                } ${
                                    header === 'Actions'
                                        ? 'pr-6 text-right'
                                        : ''
                                }`}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => (
                        <tr
                            key={record.id}
                            className="h-[59.5px] border-b border-[#f9fafb]"
                        >
                            <td className="px-4 py-3 pl-6">
                                <div>
                                    <p className="truncate text-sm leading-5 font-medium text-[#1e3a8a]">
                                        {record.title}
                                    </p>
                                    <p className="mt-0.5 truncate text-[10px] leading-[15px] text-[#99a1af]">
                                        {
                                            archiveDocumentTypeLabels[
                                                record.documentType
                                            ]
                                        }
                                    </p>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-xs leading-4 text-[#4a5565]">
                                <span className="truncate">
                                    {formatAuthors(record.authors)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs leading-4 text-[#6a7282]">
                                {record.year}
                            </td>
                            <td className="px-4 py-3 text-xs leading-4 text-[#6a7282]">
                                {formatArchiveDate(record.archiveDate)}
                            </td>
                            <td className="px-4 py-3 text-xs leading-4 text-[#6a7282]">
                                {record.archivedBy}
                            </td>
                            <td className="px-4 py-3">
                                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-2.5 text-[11px] leading-4 font-medium text-[#4a5565]">
                                    <Archive className="size-3" />
                                    Archived
                                </span>
                            </td>
                            <td className="px-4 py-3 pr-6">
                                <ArchivedResearchActions
                                    record={record}
                                    onRestore={onRestore}
                                    onDelete={onDelete}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
