import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    calculatePerformanceProject,
    createPerformanceProject,
} from '@/lib/upload/report-workflow';
import { cn } from '@/lib/utils';
import type {
    ReportPerformanceData,
    ReportPerformanceProject,
} from '@/types/upload/reportWorkflow';

type ReportPerformanceTableProps = {
    data: ReportPerformanceData;
    onChange: (data: ReportPerformanceData) => void;
};

const statusLabels: Record<ReportPerformanceProject['projectStatus'], string> =
    {
        'not-reported': 'Not Reported',
        'not-started': 'Not Started',
        'in-progress': 'In Progress',
        'substantially-complete': 'Substantially Complete',
        completed: 'Complete',
    };

const tableGridClass =
    'grid min-w-[1120px] grid-cols-[2.2fr_1fr_1fr_0.9fr_0.9fr_1.1fr_44px]';

const inputClass =
    'h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm leading-5 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10';

function accomplishmentLabel(value: number | null) {
    if (value === null) {
        return 'Not available';
    }

    return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function statusBadgeClass(status: ReportPerformanceProject['projectStatus']) {
    if (status === 'completed') {
        return 'bg-[#f0fdf4] text-[#008236]';
    }

    if (status === 'substantially-complete') {
        return 'bg-[#ecfdf5] text-[#047857]';
    }

    if (status === 'in-progress') {
        return 'bg-[#eff6ff] text-[#1e3a8a]';
    }

    if (status === 'not-started') {
        return 'bg-[#fff7ed] text-[#c2410c]';
    }

    return 'bg-[#f3f4f6] text-[#4a5565]';
}

export default function ReportPerformanceTable({
    data,
    onChange,
}: ReportPerformanceTableProps) {
    const numberOrNull = (value: string) => {
        const normalized = value.replaceAll(',', '').trim();
        const parsed = Number(normalized);

        return normalized === '' || !Number.isFinite(parsed) ? null : parsed;
    };

    const updateProject = (
        id: string,
        updates: Partial<ReportPerformanceProject>,
    ) => {
        onChange({
            ...data,
            performanceProjects: data.performanceProjects.map((project) =>
                project.id === id
                    ? calculatePerformanceProject({
                          ...project,
                          ...updates,
                      })
                    : project,
            ),
        });
    };

    const addProject = () => {
        onChange({
            ...data,
            performanceProjects: [
                ...data.performanceProjects,
                createPerformanceProject(),
            ],
        });
    };

    const removeProject = (id: string) => {
        onChange({
            ...data,
            performanceProjects: data.performanceProjects.filter(
                (project) => project.id !== id,
            ),
        });
    };

    return (
        <div className="space-y-4">
            <div
                role="table"
                aria-label="Project performance rows"
                className="overflow-x-auto rounded-[14px] border border-[#e5e7eb]"
            >
                <div
                    role="row"
                    className={cn(
                        tableGridClass,
                        'bg-[#f9fafb] text-xs font-bold text-[#6a7282]',
                    )}
                >
                    {[
                        'Activity / Output / Indicator',
                        'Target',
                        'Actual',
                        'Unit',
                        'Accomplishment %',
                        'Status',
                        '',
                    ].map((heading) => (
                        <div
                            key={heading || 'actions'}
                            role="columnheader"
                            className="px-3 py-3"
                        >
                            {heading}
                        </div>
                    ))}
                </div>
                {data.performanceProjects.map((project) => (
                    <div
                        key={project.id}
                        role="row"
                        className={cn(
                            tableGridClass,
                            'min-h-[68px] items-center border-t border-[#e5e7eb]',
                        )}
                    >
                        <div role="cell" className="p-2">
                            <input
                                value={project.projectName}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        projectName: event.target.value,
                                    })
                                }
                                placeholder="e.g. Conduct stakeholder training"
                                aria-label="Activity, output, or indicator"
                                className={inputClass}
                            />
                        </div>
                        <div role="cell" className="p-2">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={project.targetNumericValue ?? ''}
                                onChange={(event) => {
                                    const numeric = numberOrNull(
                                        event.target.value,
                                    );
                                    updateProject(project.id, {
                                        targetNumericValue: numeric,
                                        targetValue:
                                            numeric === null
                                                ? null
                                                : String(numeric),
                                    });
                                }}
                                placeholder="e.g. 1,000"
                                aria-label="Numeric target value"
                                className={inputClass}
                            />
                        </div>
                        <div role="cell" className="p-2">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={project.actualNumericValue ?? ''}
                                onChange={(event) => {
                                    const numeric = numberOrNull(
                                        event.target.value,
                                    );
                                    updateProject(project.id, {
                                        actualNumericValue: numeric,
                                        actualValue:
                                            numeric === null
                                                ? null
                                                : String(numeric),
                                    });
                                }}
                                placeholder="e.g. 800"
                                aria-label="Numeric actual value"
                                className={inputClass}
                            />
                        </div>
                        <div role="cell" className="p-2">
                            <input
                                value={project.unit}
                                onChange={(event) =>
                                    updateProject(project.id, {
                                        unit: event.target.value,
                                    })
                                }
                                placeholder="e.g. trainings"
                                aria-label="Target and actual unit"
                                className={inputClass}
                            />
                        </div>
                        <div
                            role="cell"
                            className="flex h-full items-center px-3 text-sm font-bold text-[#1e3a8a]"
                        >
                            {accomplishmentLabel(
                                project.accomplishmentPercentage,
                            )}
                        </div>
                        <div
                            role="cell"
                            className="flex h-full items-center px-3"
                        >
                            <span
                                className={cn(
                                    'inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-center text-[10px] leading-3 font-bold whitespace-normal',
                                    statusBadgeClass(project.projectStatus),
                                )}
                            >
                                {statusLabels[project.projectStatus]}
                            </span>
                        </div>
                        <div
                            role="cell"
                            className="flex h-full items-center justify-center"
                        >
                            <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-[10px] text-[#fb2c36] outline-none hover:bg-[#fff1f2] focus-visible:ring-2 focus-visible:ring-[#fb2c36]/20"
                                onClick={() => removeProject(project.id)}
                                aria-label="Delete performance row"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {data.performanceProjects.length === 0 ? (
                    <div className="min-w-[1120px] border-t border-[#e5e7eb] px-4 py-8 text-center text-sm text-[#99a1af]">
                        Add at least one project row to continue.
                    </div>
                ) : null}
            </div>

            <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[14px] border-[#bfdbfe] text-[#1e3a8a]"
                onClick={addProject}
            >
                <Plus className="size-4" />
                Add Project Row
            </Button>
        </div>
    );
}
