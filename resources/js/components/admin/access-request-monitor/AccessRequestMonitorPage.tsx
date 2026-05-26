import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { accessRequestAgencyOptions } from '@/data/mock-access-request-monitor';
import {
    auditAccessDecision,
    buildAccessRequestMonitorSummary,
    exportAccessRequestReport,
    filterAccessRequestMonitorRecords,
    getAccessRequestMonitorRecords,
    overrideAccessRequestDecision,
} from '@/lib/admin/access-request-monitor-service';
import type {
    AccessReportExportOptions,
    AccessRequestMonitorFilters,
    AccessRequestMonitorRecord,
} from '@/types/access-request-monitor';
import { AccessRequestFilters } from './AccessRequestFilters';
import { AccessRequestMonitorHeader } from './AccessRequestMonitorHeader';
import { AccessRequestMonitorTable } from './AccessRequestMonitorTable';
import { AccessRequestStats } from './AccessRequestStats';
import { AuditDecisionModal } from './AuditDecisionModal';
import { ExportAccessReportModal } from './ExportAccessReportModal';
import { OverrideDenyModal } from './OverrideDenyModal';
import { RequestsByAgencyChart } from './RequestsByAgencyChart';
import { RequestsByStatusChart } from './RequestsByStatusChart';
import { ViewRequestDetailsModal } from './ViewRequestDetailsModal';

const rowsPerPage = 8;

const initialFilters: AccessRequestMonitorFilters = {
    search: '',
    agency: 'all',
    status: 'all',
    dateRange: 'all',
    organization: 'all',
};

function buildAgencyChartData(records: AccessRequestMonitorRecord[]) {
    const counts = records.reduce<Record<string, number>>(
        (accumulator, record) => {
            accumulator[record.agencyShortName] =
                (accumulator[record.agencyShortName] ?? 0) + 1;

            return accumulator;
        },
        {},
    );

    const agencies = Array.from(
        new Set([...accessRequestAgencyOptions, ...Object.keys(counts)]),
    );

    return agencies
        .map((agency) => ({
            agency,
            count: counts[agency] ?? 0,
        }))
        .filter((item) => item.count > 0);
}

export function AccessRequestMonitorPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [records, setRecords] = useState<AccessRequestMonitorRecord[]>([]);
    const [filters, setFilters] =
        useState<AccessRequestMonitorFilters>(initialFilters);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDetailsRecord, setSelectedDetailsRecord] =
        useState<AccessRequestMonitorRecord | null>(null);
    const [selectedAuditRecord, setSelectedAuditRecord] =
        useState<AccessRequestMonitorRecord | null>(null);
    const [selectedOverrideRecord, setSelectedOverrideRecord] =
        useState<AccessRequestMonitorRecord | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        getAccessRequestMonitorRecords()
            .then((loadedRecords) => {
                if (!isCurrent) {
                    return;
                }

                setRecords(loadedRecords);
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load access request monitoring data.');
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
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, topbarSearch]);

    useEffect(() => {
        if (!feedback) {
            return undefined;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 4200);

        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const organizations = useMemo(
        () =>
            Array.from(
                new Set(records.map((record) => record.organization)),
            ).sort((left, right) => left.localeCompare(right)),
        [records],
    );

    const filteredRecords = useMemo(
        () => filterAccessRequestMonitorRecords(records, filters, topbarSearch),
        [filters, records, topbarSearch],
    );

    const summary = useMemo(
        () => buildAccessRequestMonitorSummary(filteredRecords),
        [filteredRecords],
    );

    const agencyChartData = useMemo(
        () => buildAgencyChartData(filteredRecords),
        [filteredRecords],
    );

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRecords.length / rowsPerPage),
    );
    const effectiveCurrentPage = Math.min(currentPage, totalPages);
    const paginatedRecords = filteredRecords.slice(
        (effectiveCurrentPage - 1) * rowsPerPage,
        effectiveCurrentPage * rowsPerPage,
    );

    const updateRecord = (updatedRecord: AccessRequestMonitorRecord) => {
        setRecords((current) =>
            current.map((record) =>
                record.id === updatedRecord.id ? updatedRecord : record,
            ),
        );
        setSelectedDetailsRecord((current) =>
            current?.id === updatedRecord.id ? updatedRecord : current,
        );
        setSelectedAuditRecord((current) =>
            current?.id === updatedRecord.id ? updatedRecord : current,
        );
        setSelectedOverrideRecord((current) =>
            current?.id === updatedRecord.id ? updatedRecord : current,
        );
    };

    const handleMarkReviewed = async (record: AccessRequestMonitorRecord) => {
        setIsActionLoading(true);

        try {
            const updatedRecord = await auditAccessDecision(record.id, {
                actor: 'Super Admin',
            });
            updateRecord(updatedRecord);
            setFeedback(`${record.researchTitle} audit was marked reviewed.`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleOverrideDeny = async (
        record: AccessRequestMonitorRecord,
        reason: string,
    ) => {
        setIsActionLoading(true);

        try {
            const updatedRecord = await overrideAccessRequestDecision(
                record.id,
                {
                    actor: 'Super Admin',
                    reason,
                },
            );
            updateRecord(updatedRecord);
            setSelectedOverrideRecord(null);
            setFeedback(
                `${record.requesterName}'s request was overridden and denied.`,
            );
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleExport = async (options: AccessReportExportOptions) => {
        setIsExporting(true);

        try {
            const result = await exportAccessRequestReport(options);

            setFeedback(`${result.fileName} is ready for export workflow.`);
            setIsExportOpen(false);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <div className="mx-auto flex max-w-[1230px] flex-col gap-6">
                    <AccessRequestMonitorHeader
                        onExport={() => setIsExportOpen(true)}
                    />

                    {error ? (
                        <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                            {error}
                        </div>
                    ) : null}

                    {feedback ? (
                        <div
                            role="status"
                            className="rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]"
                        >
                            {feedback}
                        </div>
                    ) : null}

                    <AccessRequestStats
                        summary={summary}
                        isLoading={isLoading}
                    />

                    <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                        <AccessRequestFilters
                            filters={filters}
                            agencies={accessRequestAgencyOptions}
                            organizations={organizations}
                            onFiltersChange={setFilters}
                            onClearFilters={() => setFilters(initialFilters)}
                        />
                        <AccessRequestMonitorTable
                            records={paginatedRecords}
                            isLoading={isLoading}
                            currentPage={effectiveCurrentPage}
                            totalPages={totalPages}
                            totalResults={filteredRecords.length}
                            rowsPerPage={rowsPerPage}
                            onPageChange={(page) =>
                                setCurrentPage(
                                    Math.min(Math.max(page, 1), totalPages),
                                )
                            }
                            onView={setSelectedDetailsRecord}
                            onAudit={setSelectedAuditRecord}
                            onOverrideDeny={setSelectedOverrideRecord}
                        />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-2">
                        <RequestsByAgencyChart
                            data={agencyChartData}
                            isLoading={isLoading}
                        />
                        <RequestsByStatusChart
                            summary={summary}
                            isLoading={isLoading}
                        />
                    </section>
                </div>
            </main>

            <ViewRequestDetailsModal
                record={selectedDetailsRecord}
                open={Boolean(selectedDetailsRecord)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedDetailsRecord(null);
                    }
                }}
            />

            <AuditDecisionModal
                record={selectedAuditRecord}
                open={Boolean(selectedAuditRecord)}
                isSaving={isActionLoading}
                onOpenChange={(open) => {
                    if (!open && !isActionLoading) {
                        setSelectedAuditRecord(null);
                    }
                }}
                onMarkReviewed={handleMarkReviewed}
            />

            <OverrideDenyModal
                record={selectedOverrideRecord}
                open={Boolean(selectedOverrideRecord)}
                isSaving={isActionLoading}
                onOpenChange={(open) => {
                    if (!open && !isActionLoading) {
                        setSelectedOverrideRecord(null);
                    }
                }}
                onConfirm={handleOverrideDeny}
            />

            <ExportAccessReportModal
                open={isExportOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportOpen}
                onExport={handleExport}
            />
        </AdminLayout>
    );
}
