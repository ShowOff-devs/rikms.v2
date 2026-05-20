import { BarChart3 } from 'lucide-react';
import ReportPerformanceTable from '@/components/upload/reports/ReportPerformanceTable';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import { REPORT_STEP_IDS } from '@/lib/upload/report-workflow';
import type {
    ReportDetailsData,
    ReportPerformanceData,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function ReportPerformanceStep(props: UploadWizardStepProps) {
    const { state, stepData, setStepData } = props;
    const data = stepData as ReportPerformanceData;
    const details = state.stepData[
        REPORT_STEP_IDS.details
    ] as ReportDetailsData;
    const projectName = details?.reportTitle || 'Untitled Report';

    const updatePerformance = (nextData: ReportPerformanceData) => {
        setStepData(nextData);
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<BarChart3 className="size-5" />}
            title="Project Performance"
            description="Compare targets against actual accomplishments and let the system calculate completion status."
        >
            <div className="mb-5 rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] p-4">
                <p className="text-[11px] font-bold text-[#1e3a8a] uppercase">
                    Auto-filled project name
                </p>
                <p className="mt-1 text-sm font-semibold text-[#101828]">
                    {projectName}
                </p>
            </div>

            <ReportPerformanceTable
                data={data}
                defaultProjectName={projectName}
                onChange={updatePerformance}
            />
        </ReportStepLayout>
    );
}
