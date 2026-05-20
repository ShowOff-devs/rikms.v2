import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, Download, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { SystemResearchStatusBadge } from '@/components/admin/system-research/SystemResearchItem';
import {
    systemResearchAccessTypeLabels,
    systemResearchDocumentTypeLabels,
} from '@/data/mock-system-research';
import { getSystemResearchRecordById } from '@/lib/admin/system-research-service';
import type { SystemResearchRecord } from '@/types/system-research';

type SystemResearchDetailRouteProps = {
    recordId: string;
};

const numberFormatter = new Intl.NumberFormat('en-US');

export default function SystemResearchDetailRoute({
    recordId,
}: SystemResearchDetailRouteProps) {
    const [search, setSearch] = useState('');
    const [record, setRecord] = useState<SystemResearchRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCurrent = true;

        getSystemResearchRecordById(recordId)
            .then((loadedRecord) => {
                if (isCurrent) {
                    setRecord(loadedRecord);
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
    }, [recordId]);

    return (
        <AdminLayout search={search} onSearchChange={setSearch}>
            <Head title={record?.title ?? 'System Research Record'} />
            <main className="px-4 py-8 lg:px-8">
                <div className="mx-auto max-w-[960px]">
                    <Link
                        href="/admin/system-research"
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Back
                    </Link>

                    {isLoading ? (
                        <div className="mt-6 rounded-[10px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
                            <div className="h-6 w-2/3 animate-pulse rounded bg-[#eef2f7]" />
                            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-[#eef2f7]" />
                            <div className="mt-6 h-32 animate-pulse rounded bg-[#eef2f7]" />
                        </div>
                    ) : record ? (
                        <section className="mt-6 rounded-[10px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-wrap items-center gap-2">
                                <SystemResearchStatusBadge
                                    status={record.status}
                                />
                                <span className="rounded-full bg-[rgba(30,58,138,0.05)] px-2.5 py-1 text-xs font-semibold text-[#1e3a8a]">
                                    {record.agencyShortName}
                                </span>
                            </div>
                            <h1 className="mt-3 text-2xl leading-9 font-bold text-[#0f172a]">
                                {record.title}
                            </h1>
                            <p className="mt-1 text-sm text-[#6a7282]">
                                {record.authors.join(', ')}
                            </p>

                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                                    <p className="text-xs font-medium text-[#99a1af]">
                                        Document Type
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#1e2939]">
                                        {
                                            systemResearchDocumentTypeLabels[
                                                record.documentType
                                            ]
                                        }
                                    </p>
                                </div>
                                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                                    <p className="text-xs font-medium text-[#99a1af]">
                                        Access Type
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#1e2939]">
                                        {
                                            systemResearchAccessTypeLabels[
                                                record.accessType
                                            ]
                                        }
                                    </p>
                                </div>
                                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                                    <p className="text-xs font-medium text-[#99a1af]">
                                        Year
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#1e2939]">
                                        {record.year}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-6 text-sm leading-6 text-[#4a5565]">
                                {record.abstract}
                            </p>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {record.sdgs.map((sdg) => (
                                    <span
                                        key={sdg}
                                        className="rounded-full bg-[rgba(30,58,138,0.06)] px-2.5 py-1 text-xs font-medium text-[#1e3a8a]"
                                    >
                                        {sdg}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-[#6a7282]">
                                <span className="inline-flex items-center gap-1">
                                    <Download
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    {numberFormatter.format(record.downloads)} downloads
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Eye className="size-4" aria-hidden="true" />
                                    {numberFormatter.format(record.views)} views
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Uploaded {record.uploadedAt}
                                </span>
                            </div>
                        </section>
                    ) : (
                        <div className="mt-6 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                            This system research record could not be found.
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
