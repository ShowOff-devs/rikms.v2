import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    SecurityReportDateRange,
    SecurityReportExportFormat,
    SecurityReportExportOptions,
} from '@/types/security-center';

type ExportFormState = {
    format: SecurityReportExportFormat | '';
    dateRange: SecurityReportDateRange | '';
    startDate: string;
    endDate: string;
    includeSummary: boolean;
    includeAlerts: boolean;
    includeLoginActivity: boolean;
    includeActiveSessions: boolean;
    includeSecurityEvents: boolean;
    includeFailedLogins: boolean;
    includePermissionChanges: boolean;
};

type ExportFormErrors = Partial<
    Record<keyof ExportFormState | 'sections', string>
>;

const initialExportState: ExportFormState = {
    format: 'pdf',
    dateRange: 'last-30-days',
    startDate: '',
    endDate: '',
    includeSummary: true,
    includeAlerts: true,
    includeLoginActivity: true,
    includeActiveSessions: true,
    includeSecurityEvents: true,
    includeFailedLogins: true,
    includePermissionChanges: true,
};

const sectionOptions: Array<{
    key: keyof Pick<
        ExportFormState,
        | 'includeSummary'
        | 'includeAlerts'
        | 'includeLoginActivity'
        | 'includeActiveSessions'
        | 'includeSecurityEvents'
        | 'includeFailedLogins'
        | 'includePermissionChanges'
    >;
    label: string;
}> = [
    { key: 'includeSummary', label: 'Security Summary' },
    { key: 'includeAlerts', label: 'Security Alerts' },
    { key: 'includeLoginActivity', label: 'Login Activity' },
    { key: 'includeActiveSessions', label: 'Active Admin Sessions' },
    { key: 'includeSecurityEvents', label: 'Recent Security Events' },
    { key: 'includeFailedLogins', label: 'Failed Login Attempts' },
    {
        key: 'includePermissionChanges',
        label: 'RBAC/Sensitive Permission Changes',
    },
];

type ExportSecurityReportModalProps = {
    open: boolean;
    isExporting: boolean;
    onOpenChange: (open: boolean) => void;
    onExport: (options: SecurityReportExportOptions) => Promise<void>;
};

export function ExportSecurityReportModal({
    open,
    isExporting,
    onOpenChange,
    onExport,
}: ExportSecurityReportModalProps) {
    const [form, setForm] = useState<ExportFormState>(initialExportState);
    const [errors, setErrors] = useState<ExportFormErrors>({});

    const updateForm = <Key extends keyof ExportFormState>(
        key: Key,
        value: ExportFormState[Key],
    ) => {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const validate = () => {
        const nextErrors: ExportFormErrors = {};

        if (!form.format) {
            nextErrors.format = 'Export format is required.';
        }

        if (!form.dateRange) {
            nextErrors.dateRange = 'Date range is required.';
        }

        if (form.dateRange === 'custom') {
            if (!form.startDate) {
                nextErrors.startDate = 'Start date is required.';
            }

            if (!form.endDate) {
                nextErrors.endDate = 'End date is required.';
            }

            if (
                form.startDate &&
                form.endDate &&
                new Date(form.endDate).getTime() <
                    new Date(form.startDate).getTime()
            ) {
                nextErrors.endDate =
                    'End date must not be earlier than start date.';
            }
        }

        const hasSection = sectionOptions.some((option) =>
            Boolean(form[option.key]),
        );

        if (!hasSection) {
            nextErrors.sections = 'Select at least one section to export.';
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    };

    const handleExport = async () => {
        if (!validate() || !form.format || !form.dateRange) {
            return;
        }

        await onExport({
            format: form.format,
            dateRange: form.dateRange,
            startDate: form.dateRange === 'custom' ? form.startDate : undefined,
            endDate: form.dateRange === 'custom' ? form.endDate : undefined,
            includeSummary: form.includeSummary,
            includeAlerts: form.includeAlerts,
            includeLoginActivity: form.includeLoginActivity,
            includeActiveSessions: form.includeActiveSessions,
            includeSecurityEvents: form.includeSecurityEvents,
            includeFailedLogins: form.includeFailedLogins,
            includePermissionChanges: form.includePermissionChanges,
        });
    };

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            setForm(initialExportState);
            setErrors({});
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[680px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <FileDown
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Export Security Report
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Choose the report format, date range, and security
                        sections to include.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="security-export-format"
                                className="text-sm font-semibold text-[#1e2939]"
                            >
                                Export Format
                            </label>
                            <Select
                                value={form.format}
                                onValueChange={(value) =>
                                    updateForm(
                                        'format',
                                        value as SecurityReportExportFormat,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="security-export-format"
                                    className="mt-2 h-10 w-full rounded-[10px] border-[#e5e7eb]"
                                >
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="csv">CSV</SelectItem>
                                    <SelectItem value="excel">Excel</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.format && (
                                <p className="mt-1 text-xs text-[#dc2626]">
                                    {errors.format}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="security-export-range"
                                className="text-sm font-semibold text-[#1e2939]"
                            >
                                Date Range
                            </label>
                            <Select
                                value={form.dateRange}
                                onValueChange={(value) =>
                                    updateForm(
                                        'dateRange',
                                        value as SecurityReportDateRange,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="security-export-range"
                                    className="mt-2 h-10 w-full rounded-[10px] border-[#e5e7eb]"
                                >
                                    <SelectValue placeholder="Select range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="last-7-days">
                                        Last 7 days
                                    </SelectItem>
                                    <SelectItem value="last-30-days">
                                        Last 30 days
                                    </SelectItem>
                                    <SelectItem value="this-month">
                                        This Month
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        Custom Range
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.dateRange && (
                                <p className="mt-1 text-xs text-[#dc2626]">
                                    {errors.dateRange}
                                </p>
                            )}
                        </div>
                    </div>

                    {form.dateRange === 'custom' && (
                        <div className="grid gap-4 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="security-export-start-date"
                                    className="text-sm font-semibold text-[#1e2939]"
                                >
                                    Custom Start Date
                                </label>
                                <input
                                    id="security-export-start-date"
                                    type="date"
                                    value={form.startDate}
                                    onChange={(event) =>
                                        updateForm(
                                            'startDate',
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                />
                                {errors.startDate && (
                                    <p className="mt-1 text-xs text-[#dc2626]">
                                        {errors.startDate}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="security-export-end-date"
                                    className="text-sm font-semibold text-[#1e2939]"
                                >
                                    Custom End Date
                                </label>
                                <input
                                    id="security-export-end-date"
                                    type="date"
                                    value={form.endDate}
                                    onChange={(event) =>
                                        updateForm(
                                            'endDate',
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                />
                                {errors.endDate && (
                                    <p className="mt-1 text-xs text-[#dc2626]">
                                        {errors.endDate}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            Include Sections
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {sectionOptions.map((option) => (
                                <label
                                    key={option.key}
                                    className="flex items-center gap-2 text-sm text-[#4a5565]"
                                >
                                    <Checkbox
                                        checked={form[option.key]}
                                        onCheckedChange={(checked) =>
                                            updateForm(
                                                option.key,
                                                Boolean(checked),
                                            )
                                        }
                                        className="border-[#d1d5dc] data-[state=checked]:border-[#1e3a8a] data-[state=checked]:bg-[#1e3a8a]"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                        {errors.sections && (
                            <p className="mt-2 text-xs text-[#dc2626]">
                                {errors.sections}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={isExporting}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white transition hover:bg-[#172554] disabled:opacity-70"
                    >
                        {isExporting ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <FileDown className="size-4" aria-hidden="true" />
                        )}
                        {isExporting ? 'Exporting...' : 'Export Report'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
