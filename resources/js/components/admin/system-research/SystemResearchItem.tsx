import {
    Building2,
    CalendarDays,
    Eye,
    Folder,
    Tag,
    Upload,
} from 'lucide-react';
import { systemResearchStatusLabels } from '@/data/mock-system-research';
import { cn } from '@/lib/utils';
import type {
    SystemResearchRecord,
    SystemResearchStatus,
} from '@/types/system-research';

const numberFormatter = new Intl.NumberFormat('en-US');

const statusStyles: Record<SystemResearchStatus, string> = {
    published: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
    'under-review': 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
    draft: 'border-[#e5e7eb] bg-[#f9fafb] text-[#6a7282]',
    archived: 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]',
};

export function SystemResearchStatusBadge({
    status,
}: {
    status: SystemResearchStatus;
}) {
    return (
        <span
            className={cn(
                'inline-flex h-[22px] items-center rounded-full border px-2.5 text-[11px] leading-4 font-semibold',
                statusStyles[status],
            )}
        >
            {systemResearchStatusLabels[status]}
        </span>
    );
}

export function SystemResearchItem({
    record,
    onView,
    onOpen,
}: {
    record: SystemResearchRecord;
    onView: (record: SystemResearchRecord) => void;
    onOpen: (record: SystemResearchRecord) => void;
}) {
    return (
        <article className="border-b border-[#f9fafb] px-4 py-4 last:border-b-0 lg:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <SystemResearchStatusBadge status={record.status} />
                        <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-[#99a1af]">
                            <Building2 className="size-3" aria-hidden="true" />
                            {record.agencyShortName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-[#99a1af]">
                            <CalendarDays
                                className="size-3"
                                aria-hidden="true"
                            />
                            {record.year}
                        </span>
                    </div>

                    <h2 className="mt-1.5 line-clamp-2 text-sm leading-5 font-semibold text-[#1e2939]">
                        {record.title}
                    </h2>

                    <p className="mt-1 line-clamp-1 text-xs leading-4 text-[#99a1af]">
                        {record.authors.join(', ')}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex h-[19px] items-center gap-1 rounded-full bg-[rgba(30,58,138,0.05)] px-2 text-[10px] leading-[15px] font-medium text-[#1e3a8a]">
                            <Tag className="size-2.5" aria-hidden="true" />
                            {record.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] leading-[15px] text-[#99a1af]">
                            <Upload className="size-2.5" aria-hidden="true" />
                            {numberFormatter.format(record.downloads)} downloads
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] leading-[15px] text-[#99a1af]">
                            <Eye className="size-2.5" aria-hidden="true" />
                            {numberFormatter.format(record.views)} views
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] leading-[15px] text-[#99a1af]">
                            <Folder className="size-2.5" aria-hidden="true" />
                            {record.sdgs[0]}
                        </span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 md:pt-0.5">
                    <button
                        type="button"
                        onClick={() => onView(record)}
                        className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        <Eye className="size-3.5" aria-hidden="true" />
                        View
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpen(record)}
                        className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        <Folder className="size-3.5" aria-hidden="true" />
                        Open
                    </button>
                </div>
            </div>
        </article>
    );
}
