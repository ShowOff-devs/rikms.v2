import {
    ArrowDown,
    ArrowUp,
    Download,
    Eye,
    Plus,
    Sparkles,
    Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import FinancialSummaryCard from '@/components/upload/shared/FinancialSummaryCard';
import SDGGrid from '@/components/upload/shared/SDGGrid';
import TagSelector from '@/components/upload/shared/TagSelector';
import {
    beneficiarySectorOptions,
    calculateFinancials,
    calculatePerformanceProject,
    createPerformanceProject,
    formatPeso,
    metadataFieldLabels,
    papCategoryOptions,
    reportAccomplishmentSummary,
    reportFinancialWarnings,
} from '@/lib/upload/report-workflow';
import { cn } from '@/lib/utils';
import type {
    ReportAIMetadataFields,
    ReportMetadataKey,
    ReportWorkflowData,
} from '@/types/upload/reportWorkflow';

export type ReportEditFieldErrors = Record<string, string>;

const inputClass =
    'mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#6a7282]';
const textareaClass =
    'mt-2 w-full rounded-[10px] border border-[#d1d5dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#6a7282]';

export function ReportSection({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            className="scroll-mt-24 rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-sm"
        >
            <h2 className="text-lg font-bold text-[#101828]">{title}</h2>
            <p className="mt-1 text-sm text-[#6a7282]">{description}</p>
            <div className="mt-5">{children}</div>
        </section>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-[#344054]">
                {label}
            </span>
            {children}
            {error ? (
                <span className="mt-1 block text-xs font-medium text-[#dc2626]">
                    {error}
                </span>
            ) : null}
        </label>
    );
}

export function DetailsSection({
    data,
    documentTypeLabel,
    disabled,
    errors,
    onChange,
}: {
    data: ReportWorkflowData;
    documentTypeLabel: string;
    disabled: boolean;
    errors: ReportEditFieldErrors;
    onChange: (data: ReportWorkflowData) => void;
}) {
    const update = (patch: Partial<ReportWorkflowData['details']>) => {
        const details = { ...data.details, ...patch };

        if (patch.reportTitle !== undefined) {
            onChange({
                ...data,
                details,
                aiMetadata: {
                    ...data.aiMetadata,
                    extractedMetadata: {
                        ...data.aiMetadata.extractedMetadata,
                        title: patch.reportTitle,
                    },
                },
            });

            return;
        }

        if (patch.reportDescription !== undefined) {
            onChange({
                ...data,
                details,
                aiMetadata: {
                    ...data.aiMetadata,
                    extractedMetadata: {
                        ...data.aiMetadata.extractedMetadata,
                        abstract: patch.reportDescription,
                    },
                },
            });

            return;
        }

        onChange({ ...data, details });
    };

    return (
        <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Report Title" error={errors.reportTitle}>
                    <input
                        value={data.details.reportTitle}
                        disabled={disabled}
                        onChange={(event) =>
                            update({ reportTitle: event.target.value })
                        }
                        className={inputClass}
                    />
                </Field>
                <Field label="Document Type">
                    <input
                        value={documentTypeLabel}
                        disabled
                        className={inputClass}
                    />
                </Field>
            </div>
            <Field label="Report Description">
                <textarea
                    value={data.details.reportDescription}
                    disabled={disabled}
                    rows={4}
                    onChange={(event) =>
                        update({ reportDescription: event.target.value })
                    }
                    className={textareaClass}
                />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Implementing Agency">
                    <input
                        value={data.details.agency}
                        disabled
                        className={inputClass}
                    />
                </Field>
                <Field label="Reporting Period" error={errors.reportingPeriod}>
                    <select
                        value={data.details.reportingPeriod}
                        disabled={disabled}
                        onChange={(event) =>
                            update({ reportingPeriod: event.target.value })
                        }
                        className={inputClass}
                    >
                        <option value="">Select period</option>
                        {['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'].map(
                            (period) => (
                                <option key={period} value={period}>
                                    {period}
                                </option>
                            ),
                        )}
                    </select>
                </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Project Start Date">
                    <input
                        type="date"
                        value={data.details.projectStartDate}
                        disabled={disabled}
                        onChange={(event) =>
                            update({ projectStartDate: event.target.value })
                        }
                        className={inputClass}
                    />
                </Field>
                <Field label="Project End Date" error={errors.projectEndDate}>
                    <input
                        type="date"
                        value={data.details.projectEndDate}
                        disabled={disabled}
                        onChange={(event) =>
                            update({ projectEndDate: event.target.value })
                        }
                        className={inputClass}
                    />
                </Field>
                <Field label="Reporting Year" error={errors.reportingYear}>
                    <input
                        type="number"
                        min={1900}
                        max={new Date().getFullYear() + 1}
                        value={data.details.reportingYear}
                        disabled={disabled}
                        onChange={(event) =>
                            update({ reportingYear: event.target.value })
                        }
                        className={inputClass}
                    />
                </Field>
            </div>
        </div>
    );
}

const metadataKeys = Object.keys(metadataFieldLabels) as ReportMetadataKey[];

function metadataText(fields: ReportAIMetadataFields, key: ReportMetadataKey) {
    const value = fields[key];

    return Array.isArray(value) ? value.join(', ') : value;
}

export function MetadataSection({
    data,
    suggestions,
    processingStatus,
    disabled,
    onChange,
}: {
    data: ReportWorkflowData;
    suggestions: Partial<ReportAIMetadataFields>;
    processingStatus: string;
    disabled: boolean;
    onChange: (data: ReportWorkflowData) => void;
}) {
    const updateField = (key: ReportMetadataKey, rawValue: string) => {
        const value =
            key === 'keywords' || key === 'authors'
                ? rawValue
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                : rawValue;
        const extractedMetadata = {
            ...data.aiMetadata.extractedMetadata,
            [key]: value,
        };
        const userEditedFields = data.aiMetadata.userEditedFields.includes(key)
            ? data.aiMetadata.userEditedFields
            : [...data.aiMetadata.userEditedFields, key];
        const next = {
            ...data,
            aiMetadata: {
                ...data.aiMetadata,
                extractedMetadata,
                userEditedFields,
                metadataValidated: true,
            },
        };

        if (key === 'title') {
            next.details = { ...next.details, reportTitle: rawValue };
        }

        if (key === 'abstract') {
            next.details = { ...next.details, reportDescription: rawValue };
        }

        onChange(next);
    };

    const togglePublic = (key: ReportMetadataKey) => {
        onChange({
            ...data,
            aiMetadata: {
                ...data.aiMetadata,
                selectedPublicMetadata:
                    data.aiMetadata.selectedPublicMetadata.includes(key)
                        ? data.aiMetadata.selectedPublicMetadata.filter(
                              (item) => item !== key,
                          )
                        : [...data.aiMetadata.selectedPublicMetadata, key],
            },
        });
    };

    return (
        <div className="space-y-4">
            <div className="rounded-[12px] border border-[#ddd6fe] bg-[#f5f3ff] p-3 text-sm text-[#6d28d9]">
                AI processing status: <strong>{processingStatus}</strong>.
                Suggestions never replace saved metadata unless you apply them.
            </div>
            {metadataKeys.map((key) => {
                const suggestion = suggestions[key];
                const suggestionText = Array.isArray(suggestion)
                    ? suggestion.join(', ')
                    : (suggestion ?? '');
                const current = metadataText(
                    data.aiMetadata.extractedMetadata,
                    key,
                );
                const isLong = !['title', 'keywords', 'authors'].includes(key);

                return (
                    <div
                        key={key}
                        className="rounded-[14px] border border-[#e5e7eb] p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-sm font-bold text-[#101828]">
                                {metadataFieldLabels[key]}
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold text-[#4a5565]">
                                <input
                                    type="checkbox"
                                    checked={data.aiMetadata.selectedPublicMetadata.includes(
                                        key,
                                    )}
                                    disabled={disabled}
                                    onChange={() => togglePublic(key)}
                                />
                                Public metadata
                            </label>
                        </div>
                        {isLong ? (
                            <textarea
                                value={current}
                                rows={4}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateField(key, event.target.value)
                                }
                                className={textareaClass}
                            />
                        ) : (
                            <input
                                value={current}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateField(key, event.target.value)
                                }
                                className={inputClass}
                            />
                        )}
                        {suggestionText && suggestionText !== current ? (
                            <div className="mt-3 flex flex-col gap-2 rounded-[10px] border border-[#ddd6fe] bg-[#faf7ff] p-3 sm:flex-row sm:items-start sm:justify-between">
                                <p className="text-xs leading-5 text-[#6d28d9]">
                                    <Sparkles className="mr-1 inline size-3.5" />
                                    {suggestionText}
                                </p>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                        updateField(key, suggestionText)
                                    }
                                    className="shrink-0 text-xs font-bold text-[#6d28d9] disabled:opacity-50"
                                >
                                    Apply suggestion
                                </button>
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

export function PerformanceSection({
    data,
    disabled,
    errors,
    onChange,
}: {
    data: ReportWorkflowData;
    disabled: boolean;
    errors: ReportEditFieldErrors;
    onChange: (data: ReportWorkflowData) => void;
}) {
    const updatePerformance = (
        patch: Partial<ReportWorkflowData['performance']>,
    ) => onChange({ ...data, performance: { ...data.performance, ...patch } });
    const updateProject = (
        id: string,
        patch: Partial<
            ReportWorkflowData['performance']['performanceProjects'][number]
        >,
    ) =>
        updatePerformance({
            performanceProjects: data.performance.performanceProjects.map(
                (project) =>
                    project.id === id
                        ? calculatePerformanceProject({ ...project, ...patch })
                        : project,
            ),
        });
    const move = (index: number, direction: -1 | 1) => {
        const next = [...data.performance.performanceProjects];
        const target = index + direction;

        if (target < 0 || target >= next.length) {
            return;
        }

        [next[index], next[target]] = [next[target], next[index]];
        updatePerformance({ performanceProjects: next });
    };
    const summary = reportAccomplishmentSummary(data.performance);

    return (
        <div className="space-y-4">
            {data.performance.performanceProjects.map((project, index) => (
                <div
                    key={project.id}
                    className="rounded-[14px] border border-[#e5e7eb] p-4"
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[#101828]">
                            Performance Item {index + 1}
                        </p>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                disabled={disabled || index === 0}
                                onClick={() => move(index, -1)}
                                className="rounded p-2 text-[#4a5565] disabled:opacity-30"
                                aria-label="Move performance item up"
                            >
                                <ArrowUp className="size-4" />
                            </button>
                            <button
                                type="button"
                                disabled={
                                    disabled ||
                                    index ===
                                        data.performance.performanceProjects
                                            .length -
                                            1
                                }
                                onClick={() => move(index, 1)}
                                className="rounded p-2 text-[#4a5565] disabled:opacity-30"
                                aria-label="Move performance item down"
                            >
                                <ArrowDown className="size-4" />
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                    updatePerformance({
                                        performanceProjects:
                                            data.performance.performanceProjects.filter(
                                                (item) =>
                                                    item.id !== project.id,
                                            ),
                                    })
                                }
                                className="rounded p-2 text-[#dc2626] disabled:opacity-30"
                                aria-label="Remove performance item"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="Project / Activity Name">
                            <input
                                value={project.projectName}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        projectName: event.target.value,
                                    })
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Target Value">
                            <input
                                value={project.targetValue ?? ''}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        targetValue: event.target.value || null,
                                    })
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Actual Value">
                            <input
                                value={project.actualValue ?? ''}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        actualValue: event.target.value || null,
                                    })
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Unit">
                            <input
                                value={project.unit}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        unit: event.target.value,
                                    })
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Numeric Target">
                            <input
                                type="number"
                                min={0}
                                value={project.targetNumericValue ?? ''}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        targetNumericValue:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Numeric Actual">
                            <input
                                type="number"
                                min={0}
                                value={project.actualNumericValue ?? ''}
                                disabled={disabled}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        actualNumericValue:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Accomplishment">
                            <input
                                value={
                                    project.accomplishmentPercentage === null
                                        ? 'Not calculated'
                                        : `${project.accomplishmentPercentage}%`
                                }
                                disabled
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Calculated Status">
                            <input
                                value={project.projectStatus.replaceAll(
                                    '-',
                                    ' ',
                                )}
                                disabled
                                className={cn(inputClass, 'capitalize')}
                            />
                        </Field>
                    </div>
                    <Field label="Remarks">
                        <textarea
                            value={project.remarks ?? ''}
                            disabled={disabled}
                            rows={2}
                            onChange={(event) =>
                                updateProject(project.id, {
                                    remarks: event.target.value,
                                })
                            }
                            className={textareaClass}
                        />
                    </Field>
                </div>
            ))}
            <button
                type="button"
                disabled={disabled}
                onClick={() =>
                    updatePerformance({
                        performanceProjects: [
                            ...data.performance.performanceProjects,
                            createPerformanceProject(),
                        ],
                    })
                }
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#bfdbfe] px-4 text-sm font-semibold text-[#1e3a8a] disabled:opacity-50"
            >
                <Plus className="size-4" /> Add performance item
            </button>
            <div className="grid gap-4 md:grid-cols-2">
                <Field
                    label="Official Physical Accomplishment (%)"
                    error={errors.physicalAccomplishmentPercent}
                >
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={
                            data.performance.physicalAccomplishmentPercent ?? ''
                        }
                        disabled={disabled}
                        onChange={(event) =>
                            updatePerformance({
                                physicalAccomplishmentPercent:
                                    event.target.value === ''
                                        ? null
                                        : Number(event.target.value),
                            })
                        }
                        className={inputClass}
                    />
                </Field>
                <div className="rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm text-[#1e3a8a]">
                    Calculated average:{' '}
                    <strong>
                        {summary.calculatedPercentage === null
                            ? 'Not available'
                            : `${summary.calculatedPercentage}%`}
                    </strong>
                    <br />
                    Displayed result uses the official value when one is
                    recorded.
                </div>
            </div>
            <Field label="Performance Remarks">
                <textarea
                    value={data.performance.performanceRemarks ?? ''}
                    disabled={disabled}
                    rows={3}
                    onChange={(event) =>
                        updatePerformance({
                            performanceRemarks: event.target.value,
                        })
                    }
                    className={textareaClass}
                />
            </Field>
        </div>
    );
}

export function PAPSection({
    data,
    disabled,
    onChange,
}: {
    data: ReportWorkflowData;
    disabled: boolean;
    onChange: (data: ReportWorkflowData) => void;
}) {
    const update = (patch: Partial<ReportWorkflowData['papClassification']>) =>
        onChange({
            ...data,
            papClassification: { ...data.papClassification, ...patch },
        });

    return (
        <div className="space-y-5">
            <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
                <p className="mb-3 text-sm font-bold text-[#101828]">
                    PAP Categories
                </p>
                <TagSelector
                    options={papCategoryOptions.map((value) => ({
                        value,
                        label: value,
                    }))}
                    selected={data.papClassification.papCategories}
                    onChange={(papCategories) => update({ papCategories })}
                    tone="violet"
                />
            </div>
            <Field label="PAP Description">
                <textarea
                    value={data.papClassification.papDescription}
                    disabled={disabled}
                    rows={4}
                    onChange={(event) =>
                        update({ papDescription: event.target.value })
                    }
                    className={textareaClass}
                />
            </Field>
            <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
                <p className="mb-3 text-sm font-bold text-[#101828]">
                    Beneficiary Sectors
                </p>
                <TagSelector
                    options={beneficiarySectorOptions}
                    selected={data.papClassification.beneficiarySectors}
                    onChange={(beneficiarySectors) =>
                        update({ beneficiarySectors })
                    }
                    tone="blue"
                />
            </div>
        </div>
    );
}

export function FinancialSection({
    data,
    disabled,
    errors,
    onChange,
}: {
    data: ReportWorkflowData;
    disabled: boolean;
    errors: ReportEditFieldErrors;
    onChange: (data: ReportWorkflowData) => void;
}) {
    const update = (patch: Partial<ReportWorkflowData['financials']>) => {
        const financials = { ...data.financials, ...patch };

        onChange({
            ...data,
            financials: {
                ...financials,
                ...calculateFinancials(
                    financials.allocatedBudget,
                    financials.usedBudget,
                ),
            },
        });
    };
    const numberValue = (value: string) =>
        value === '' ? null : Number(value);
    const warnings = reportFinancialWarnings(data.financials, data.details);

    return (
        <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Allocated Budget', 'allocatedBudget'],
                    ['Released Amount', 'releasedAmount'],
                    ['Obligated Amount', 'obligatedAmount'],
                    ['Utilized Amount', 'usedBudget'],
                ].map(([label, key]) => (
                    <Field key={key} label={label} error={errors[key]}>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                                (data.financials[
                                    key as keyof typeof data.financials
                                ] as number | '' | null) ?? ''
                            }
                            disabled={disabled}
                            onChange={(event) =>
                                update({
                                    [key]: numberValue(event.target.value),
                                })
                            }
                            className={inputClass}
                        />
                    </Field>
                ))}
            </div>
            <Field label="Financial As-of Date">
                <input
                    type="date"
                    value={data.financials.financialAsOfDate}
                    disabled={disabled}
                    onChange={(event) =>
                        update({ financialAsOfDate: event.target.value })
                    }
                    className={inputClass}
                />
            </Field>
            {warnings.length > 0 ? (
                <div className="rounded-[12px] border border-[#fde68a] bg-[#fffbeb] p-3 text-xs text-[#92400e]">
                    {warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                    ))}
                </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <FinancialSummaryCard
                    label="Allocated Budget"
                    value={
                        data.financials.allocatedBudget === null
                            ? 'Not provided'
                            : formatPeso(data.financials.allocatedBudget)
                    }
                    tone="blue"
                />
                <FinancialSummaryCard
                    label="Released Budget"
                    value={
                        data.financials.releasedAmount === null
                            ? 'Not provided'
                            : formatPeso(data.financials.releasedAmount)
                    }
                    tone="violet"
                />
                <FinancialSummaryCard
                    label="Obligated Budget"
                    value={
                        data.financials.obligatedAmount === null
                            ? 'Not provided'
                            : formatPeso(data.financials.obligatedAmount)
                    }
                    tone="violet"
                />
                <FinancialSummaryCard
                    label="Utilized Budget"
                    value={
                        data.financials.usedBudget === null
                            ? 'Not provided'
                            : formatPeso(data.financials.usedBudget)
                    }
                    tone="green"
                />
                <FinancialSummaryCard
                    label="Remaining Balance"
                    value={
                        data.financials.remainingBalance === null
                            ? 'Not provided'
                            : formatPeso(data.financials.remainingBalance)
                    }
                    tone="blue"
                />
                <FinancialSummaryCard
                    label="Utilization Rate"
                    value={
                        data.financials.utilizationRate === null
                            ? 'Not available'
                            : `${data.financials.utilizationRate}%`
                    }
                    tone="green"
                />
            </div>
        </div>
    );
}

export function HighlightsSection({
    data,
    disabled,
    uploadBusy,
    onChange,
    onUpload,
    onRemoveFile,
    onPreviewFile,
    onDownloadFile,
}: {
    data: ReportWorkflowData;
    disabled: boolean;
    uploadBusy: boolean;
    onChange: (data: ReportWorkflowData) => void;
    onUpload: (file: File) => void;
    onRemoveFile: (fileId: string) => void;
    onPreviewFile: (fileId: string) => void;
    onDownloadFile: (fileId: string, fileName: string) => void;
}) {
    const update = (patch: Partial<ReportWorkflowData['highlights']>) =>
        onChange({
            ...data,
            highlights: { ...data.highlights, ...patch },
        });

    return (
        <div className="space-y-5">
            <Field label="Highlight Title">
                <input
                    value={data.highlights.highlightTitle}
                    disabled={disabled}
                    onChange={(event) =>
                        update({ highlightTitle: event.target.value })
                    }
                    className={inputClass}
                />
            </Field>
            <Field label="Highlight Description">
                <textarea
                    value={data.highlights.highlightDescription}
                    disabled={disabled}
                    rows={5}
                    onChange={(event) =>
                        update({ highlightDescription: event.target.value })
                    }
                    className={textareaClass}
                />
                <span className="mt-1 block text-xs text-[#6a7282]">
                    {data.highlights.highlightDescription.length} characters; 40
                    required before uploading attachments.
                </span>
            </Field>
            <label className="flex items-center gap-3 rounded-[12px] border border-[#e5e7eb] p-4 text-sm font-semibold text-[#344054]">
                <input
                    type="checkbox"
                    checked={data.highlights.featuredHighlight}
                    disabled={disabled}
                    onChange={(event) =>
                        update({ featuredHighlight: event.target.checked })
                    }
                />
                Featured highlight
            </label>
            <div>
                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    disabled={disabled || uploadBusy}
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                            onUpload(file);
                        }

                        event.target.value = '';
                    }}
                    className="block w-full rounded-[10px] border border-[#d1d5dc] p-2 text-sm disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-[#6a7282]">
                    PDF, PNG, or JPEG; up to five secure supporting files.
                </p>
            </div>
            {data.highlights.uploadError ? (
                <p className="text-xs font-medium text-[#dc2626]">
                    {data.highlights.uploadError}
                </p>
            ) : null}
            <div className="space-y-2">
                {data.highlights.supportingFiles.map((file) => (
                    <div
                        key={file.id}
                        className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-sm"
                    >
                        <span className="truncate">{file.name}</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onPreviewFile(file.id)}
                                className="text-[#1e3a8a]"
                                aria-label={`Preview ${file.name}`}
                            >
                                <Eye className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    onDownloadFile(file.id, file.name)
                                }
                                className="text-[#1e3a8a]"
                                aria-label={`Download ${file.name}`}
                            >
                                <Download className="size-4" />
                            </button>
                            <button
                                type="button"
                                disabled={disabled || uploadBusy}
                                onClick={() => onRemoveFile(file.id)}
                                className="text-[#dc2626] disabled:opacity-40"
                                aria-label={`Remove ${file.name}`}
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SDGSection({
    data,
    disabled,
    onChange,
}: {
    data: ReportWorkflowData;
    disabled: boolean;
    onChange: (data: ReportWorkflowData) => void;
}) {
    const update = (selectedSDGs: number[]) =>
        onChange({
            ...data,
            sdgTagging: {
                ...data.sdgTagging,
                selectedSDGs,
                sdgSelectionValidated: selectedSDGs.length > 0,
            },
        });

    return (
        <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
            {data.sdgTagging.aiSuggestedSDGs.length > 0 ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#ddd6fe] bg-[#f5f3ff] p-3 text-sm text-[#6d28d9]">
                    <span>
                        AI suggests SDG{' '}
                        {data.sdgTagging.aiSuggestedSDGs.join(', SDG ')}
                    </span>
                    <button
                        type="button"
                        onClick={() => update(data.sdgTagging.aiSuggestedSDGs)}
                        className="font-bold"
                    >
                        Apply suggestions
                    </button>
                </div>
            ) : null}
            <SDGGrid
                selectedSDGs={data.sdgTagging.selectedSDGs}
                suggestedSDGs={data.sdgTagging.aiSuggestedSDGs}
                onChange={update}
            />
        </div>
    );
}
