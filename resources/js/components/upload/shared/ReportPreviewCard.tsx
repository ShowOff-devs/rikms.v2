import { Check, Eye, FileText } from 'lucide-react';
import {
    getReportTypeLabel,
    reportReadinessCount,
} from '@/lib/upload/report-workflow';
import { cn } from '@/lib/utils';
import type { ReportWorkflowData } from '@/types/upload/reportWorkflow';
import type { UploadStepId, UploadWizardStep } from '@/types/uploadWizard';

type ReportPreviewCardProps = {
    data: ReportWorkflowData;
    steps: UploadWizardStep[];
    activeStepId: UploadStepId;
};

export default function ReportPreviewCard({
    data,
    steps,
    activeStepId,
}: ReportPreviewCardProps) {
    const currentStepNumber =
        steps.findIndex((step) => step.id === activeStepId) + 1;
    const readiness = reportReadinessCount(data);
    const completion =
        data.performance.performanceProjects.length > 0
            ? Math.round(
                  data.performance.performanceProjects.reduce(
                      (total, project) =>
                          total + project.accomplishmentPercentage,
                      0,
                  ) / data.performance.performanceProjects.length,
              )
            : 0;

    return (
        <aside className="hidden w-[270px] shrink-0 space-y-3 xl:block">
            <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#ddd6fe] bg-[#f5f3ff] px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#7c3aed]">
                        <Eye className="size-4" />
                        Report Preview
                    </div>
                    <span className="text-[10px] font-medium text-[#7c3aed]/60">
                        Step {currentStepNumber}/{steps.length}
                    </span>
                </div>
                <div className="space-y-4 p-4">
                    <div>
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-[#7c3aed]">
                            <FileText className="size-3.5" />
                            {getReportTypeLabel(data.documentType)}
                        </div>
                        <h3 className="line-clamp-2 text-sm leading-[19.25px] font-semibold text-[#1e2939]">
                            {data.details.reportTitle || 'Untitled Report'}
                        </h3>
                        <p className="mt-2 truncate text-[10px] text-[#99a1af]">
                            {data.details.reportingYear || '2026'}
                            {data.details.uploadedFileName
                                ? ` - ${data.details.uploadedFileName}`
                                : ''}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[10px] bg-[#eff6ff] px-3 py-3 text-center">
                            <p className="text-base font-bold text-[#1e3a8a]">
                                {data.performance.performanceProjects.length}
                            </p>
                            <p className="text-[9px] text-[#99a1af]">
                                Projects
                            </p>
                        </div>
                        <div className="rounded-[10px] bg-[#f0fdf4] px-3 py-3 text-center">
                            <p className="text-base font-bold text-[#00a63e]">
                                {completion}%
                            </p>
                            <p className="text-[9px] text-[#99a1af]">
                                Completion
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-[#f3f4f6] pt-2">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-[#99a1af] uppercase">
                                Readiness
                            </span>
                            <span className="text-[10px] font-bold text-[#7c3aed]">
                                {readiness}/{steps.length}
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#f3f4f6]">
                            <div
                                className="h-full rounded-full bg-[#7c3aed]"
                                style={{
                                    width: `${(readiness / steps.length) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <p className="mb-3 text-[9px] font-bold text-[#99a1af] uppercase">
                    9-Step Report Flow
                </p>
                <div className="space-y-1.5">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isDone = index + 1 < currentStepNumber;
                        const isCurrent = step.id === activeStepId;

                        return (
                            <div
                                key={step.id}
                                className="flex items-center gap-2"
                            >
                                <span
                                    className={cn(
                                        'flex size-4 items-center justify-center rounded-full text-[9px] font-medium',
                                        isDone
                                            ? 'bg-[#00c950] text-white'
                                            : isCurrent
                                              ? 'bg-[#1e3a8a] text-white'
                                              : 'bg-[#f3f4f6] text-[#99a1af]',
                                    )}
                                >
                                    {isDone ? (
                                        <Check className="size-2.5" />
                                    ) : (
                                        stepNumber
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'text-[11px] font-medium',
                                        isDone
                                            ? 'text-[#00a63e]'
                                            : isCurrent
                                              ? 'text-[#1e3a8a]'
                                              : 'text-[#d1d5dc]',
                                    )}
                                >
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </aside>
    );
}
