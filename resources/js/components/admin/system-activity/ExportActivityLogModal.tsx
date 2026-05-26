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
    ActivityExportDateRange,
    ActivityExportFormat,
    ActivityExportOptions,
} from '@/types/system-activity';

type ExportFormState = {
    format: ActivityExportFormat | '';
    dateRange: ActivityExportDateRange | '';
    startDate: string;
    endDate: string;
    includeNotifications: boolean;
    includeActivityLogs: boolean;
    includeTimeline: boolean;
    includeSecurityEvents: boolean;
};

type ExportFormErrors = Partial<
    Record<keyof ExportFormState | 'sections', string>
>;

const initialExportState: ExportFormState = {
    format: 'csv',
    dateRange: 'last-30-days',
    startDate: '',
    endDate: '',
    includeNotifications: true,
    includeActivityLogs: true,
    includeTimeline: true,
    includeSecurityEvents: true,
};

type ExportActivityLogModalProps = {
    open: boolean;
    isExporting: boolean;
    onOpenChange: (open: boolean) => void;
    onExport: (options: ActivityExportOptions) => Promise<void>;
};

export function ExportActivityLogModal({
    open,
    isExporting,
    onOpenChange,
    onExport,
}: ExportActivityLogModalProps) {
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

        const hasSection =
            form.includeNotifications ||
            form.includeActivityLogs ||
            form.includeTimeline ||
            form.includeSecurityEvents;

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
            includeNotifications: form.includeNotifications,
            includeActivityLogs: form.includeActivityLogs,
            includeTimeline: form.includeTimeline,
            includeSecurityEvents: form.includeSecurityEvents,
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
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <FileDown
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Export Activity Log
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Choose the export format and date range for the activity
                        logs you want to generate.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="activity-export-format"
                                className="text-sm font-semibold text-[#1e2939]"
                            >
                                Export Format
                            </label>
                            <Select
                                value={form.format}
                                onValueChange={(value) =>
                                    updateForm(
                                        'format',
                                        value as ActivityExportFormat,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="activity-export-format"
                                    className="mt-2 h-10 w-full rounded-[10px] border-[#e5e7eb]"
                                >
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">CSV</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
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
                                htmlFor="activity-export-range"
                                className="text-sm font-semibold text-[#1e2939]"
                            >
                                Date Range
                            </label>
                            <Select
                                value={form.dateRange}
                                onValueChange={(value) =>
                                    updateForm(
                                        'dateRange',
                                        value as ActivityExportDateRange,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="activity-export-range"
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
                                    htmlFor="activity-export-start-date"
                                    className="text-sm font-semibold text-[#1e2939]"
                                >
                                    Custom Start Date
                                </label>
                                <input
                                    id="activity-export-start-date"
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
                                    htmlFor="activity-export-end-date"
                                    className="text-sm font-semibold text-[#1e2939]"
                                >
                                    Custom End Date
                                </label>
                                <input
                                    id="activity-export-end-date"
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
                            {[
                                [
                                    'includeNotifications',
                                    'System Notifications',
                                ],
                                ['includeActivityLogs', 'Activity Logs'],
                                ['includeTimeline', 'Activity Timeline'],
                                ['includeSecurityEvents', 'Security Events'],
                            ].map(([key, label]) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-2 text-sm text-[#4a5565]"
                                >
                                    <Checkbox
                                        checked={
                                            form[
                                                key as keyof ExportFormState
                                            ] as boolean
                                        }
                                        onCheckedChange={(checked) =>
                                            updateForm(
                                                key as keyof ExportFormState,
                                                Boolean(checked) as never,
                                            )
                                        }
                                        className="border-[#d1d5dc] data-[state=checked]:border-[#1e3a8a] data-[state=checked]:bg-[#1e3a8a]"
                                    />
                                    {label}
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
                        onClick={() => onOpenChange(false)}
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
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
