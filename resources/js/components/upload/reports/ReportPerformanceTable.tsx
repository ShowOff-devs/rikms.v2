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
    defaultProjectName: string;
    onChange: (data: ReportPerformanceData) => void;
};

const statusLabels: Record<ReportPerformanceProject['projectStatus'], string> =
    {
        'not-started': 'Not Started',
        'in-progress': 'In Progress',
        completed: 'Completed',
    };

export default function ReportPerformanceTable({
    data,
    defaultProjectName,
    onChange,
}: ReportPerformanceTableProps) {
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
                createPerformanceProject(defaultProjectName),
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
            <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb]">
                <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.8fr_44px] bg-[#f9fafb] text-xs font-bold text-[#6a7282]">
                    {[
                        'Project Name',
                        'Target',
                        'Actual %',
                        'Accomplishment %',
                        'Status',
                        '',
                    ].map((heading) => (
                        <div key={heading} className="px-3 py-3">
                            {heading}
                        </div>
                    ))}
                </div>
                {data.performanceProjects.map((project) => (
                    <div
                        key={project.id}
                        className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.8fr_44px] items-center border-t border-[#e5e7eb]"
                    >
                        <input
                            value={project.projectName}
                            onChange={(event) =>
                                updateProject(project.id, {
                                    projectName: event.target.value,
                                })
                            }
                            className="m-2 h-10 rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a]"
                        />
                        <input
                            type="number"
                            value={project.targetValue || ''}
                            min={0}
                            onChange={(event) =>
                                updateProject(project.id, {
                                    targetValue: Number(event.target.value),
                                })
                            }
                            className="m-2 h-10 rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a]"
                        />
                        <input
                            type="number"
                            value={project.actualValue || ''}
                            min={0}
                            onChange={(event) =>
                                updateProject(project.id, {
                                    actualValue: Number(event.target.value),
                                })
                            }
                            className="m-2 h-10 rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a]"
                        />
                        <div className="px-3 text-sm font-bold text-[#1e3a8a]">
                            {project.accomplishmentPercentage}%
                        </div>
                        <div className="px-3">
                            <span
                                className={cn(
                                    'rounded-full px-2 py-1 text-[10px] font-bold',
                                    project.projectStatus === 'completed'
                                        ? 'bg-[#f0fdf4] text-[#00a63e]'
                                        : project.projectStatus ===
                                            'in-progress'
                                          ? 'bg-[#eff6ff] text-[#1e3a8a]'
                                          : 'bg-[#f3f4f6] text-[#6a7282]',
                                )}
                            >
                                {statusLabels[project.projectStatus]}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="mx-2 flex size-8 items-center justify-center rounded-[10px] text-[#fb2c36] hover:bg-[#fff1f2]"
                            onClick={() => removeProject(project.id)}
                        >
                            <Trash2 className="size-4" />
                        </button>
                    </div>
                ))}
                {data.performanceProjects.length === 0 ? (
                    <div className="border-t border-[#e5e7eb] px-4 py-8 text-center text-sm text-[#99a1af]">
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
