import type { ReactNode } from 'react';
import ReportPreviewCard from '@/components/upload/shared/ReportPreviewCard';
import UploadValidationSummary from '@/components/upload/shared/UploadValidationSummary';
import { buildReportWorkflowData } from '@/lib/upload/report-workflow';
import type { ReportDocumentType } from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

type ReportStepLayoutProps = UploadWizardStepProps & {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
    tone?: 'blue' | 'violet' | 'green';
};

const toneClasses = {
    blue: 'bg-[#eff6ff] text-[#1e3a8a]',
    violet: 'bg-[#f5f3ff] text-[#7c3aed]',
    green: 'bg-[#f0fdf4] text-[#00a63e]',
};

export default function ReportStepLayout({
    config,
    state,
    step,
    stepIndex,
    totalSteps,
    errors,
    icon,
    title,
    description,
    children,
    tone = 'blue',
}: ReportStepLayoutProps) {
    const workflowData = buildReportWorkflowData(
        config.type as ReportDocumentType,
        state.stepData,
    );

    return (
        <div className="flex items-start gap-5">
            <section className="min-w-0 flex-1 rounded-[14px] border border-[#e5e7eb] bg-white p-7 shadow-sm">
                <div className="flex gap-4 border-b border-[#f3f4f6] pb-5">
                    <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-[14px] ${toneClasses[tone]}`}
                    >
                        {icon}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-[16.8px] leading-[25.2px] font-bold text-[#101828]">
                                {title}
                            </h2>
                            <span className="rounded-full bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-bold text-white">
                                STEP {stepIndex + 1} OF {totalSteps}
                            </span>
                        </div>
                        <p className="mt-1 text-sm leading-[22.75px] text-[#6a7282]">
                            {description}
                        </p>
                    </div>
                </div>
                <div className="pt-5">
                    <UploadValidationSummary errors={errors} />
                    {children}
                </div>
            </section>

            <ReportPreviewCard
                data={workflowData}
                steps={config.steps}
                activeStepId={step.id}
            />
        </div>
    );
}
