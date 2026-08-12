import { BarChart3 } from 'lucide-react';
import ReportPerformanceTable from '@/components/upload/reports/ReportPerformanceTable';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import {
    OFFICIAL_CALCULATED_TOLERANCE,
    REPORT_STEP_IDS,
    reportAccomplishmentSummary,
} from '@/lib/upload/report-workflow';
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
    const accomplishment = reportAccomplishmentSummary(data);
    const requiresExplanation =
        accomplishment.difference !== null &&
        accomplishment.difference > OFFICIAL_CALCULATED_TOLERANCE;

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

            <div className="mt-5 grid gap-3 rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-bold text-[#6a7282] uppercase">
                        Official value
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#1e3a8a]">
                        {accomplishment.officialPercentage === null
                            ? 'Not reported'
                            : `${accomplishment.officialPercentage}%`}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-bold text-[#6a7282] uppercase">
                        Calculated row average
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#4a5565]">
                        {accomplishment.calculatedPercentage === null
                            ? 'Not available'
                            : `${accomplishment.calculatedPercentage}%`}
                    </p>
                </div>
                <p className="text-xs leading-5 text-[#6a7282] sm:col-span-2">
                    The official value is used for reporting. The calculated
                    value is shown for comparison and averages only calculable
                    rows.
                </p>
            </div>

            <label className="mt-5 block">
                <span className="text-sm font-semibold text-[#344054]">
                    Performance Remarks
                    {requiresExplanation ? (
                        <span className="text-[#fb2c36]"> *</span>
                    ) : null}
                </span>
                <textarea
                    value={data.performanceRemarks ?? ''}
                    onChange={(event) =>
                        updatePerformance({
                            ...data,
                            performanceRemarks: event.target.value,
                        })
                    }
                    rows={3}
                    className="mt-2 w-full rounded-[10px] border border-[#d1d5dc] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    placeholder="Explain context, especially any difference between official and calculated values."
                />
                {requiresExplanation ? (
                    <span className="mt-1 block text-xs text-[#b45309]">
                        The official and calculated values differ by{' '}
                        {accomplishment.difference} percentage points. Add an
                        explanation before submission.
                    </span>
                ) : null}
            </label>
        </ReportStepLayout>
    );
}
