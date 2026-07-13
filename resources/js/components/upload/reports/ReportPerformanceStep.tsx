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
    const numberOrNull = (value: string) => {
        const parsed = Number(value);

        return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<BarChart3 className="size-5" />}
            title="Project Performance"
            description="Compare planned targets with actual accomplishments. The system calculates the row accomplishment percentage when numeric values are available."
        >
            <div className="mb-5 rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] p-4">
                <p className="text-[11px] font-bold text-[#1e3a8a] uppercase">
                    Report Title
                </p>
                <p className="mt-1 text-sm font-semibold text-[#101828]">
                    {projectName}
                </p>
            </div>

            <label className="mb-5 block">
                <span className="text-sm font-semibold text-[#344054]">
                    Overall Physical Accomplishment (%)
                </span>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={data.physicalAccomplishmentPercent ?? ''}
                    onChange={(event) =>
                        updatePerformance({
                            ...data,
                            physicalAccomplishmentPercent: numberOrNull(
                                event.target.value,
                            ),
                        })
                    }
                    className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="0"
                />
                <span className="mt-2 block text-xs leading-5 text-[#6a7282]">
                    Enter the official overall physical accomplishment reported
                    for the project.
                </span>
            </label>

            <ReportPerformanceTable data={data} onChange={updatePerformance} />
        </ReportStepLayout>
    );
}
