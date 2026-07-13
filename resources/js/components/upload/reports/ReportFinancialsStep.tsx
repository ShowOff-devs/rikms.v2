import { AlertTriangle, WalletCards } from 'lucide-react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import FinancialSummaryCard from '@/components/upload/shared/FinancialSummaryCard';
import {
    REPORT_STEP_IDS,
    calculateFinancials,
    formatPeso,
    reportFinancialWarnings,
} from '@/lib/upload/report-workflow';
import type {
    ReportDetailsData,
    ReportFinancialsData,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function ReportFinancialsStep(props: UploadWizardStepProps) {
    const { state, stepData, setStepData, errors } = props;
    const data = stepData as ReportFinancialsData;
    const details = (state.stepData[
        REPORT_STEP_IDS.details
    ] as ReportDetailsData) ?? {
        projectStartDate: '',
        projectEndDate: '',
    };
    const warnings = reportFinancialWarnings(data, details);

    const updateFinancials = (updates: Partial<ReportFinancialsData>) => {
        const nextData = {
            ...data,
            ...updates,
        };

        setStepData({
            ...nextData,
            ...calculateFinancials(
                nextData.allocatedBudget,
                nextData.usedBudget,
            ),
        } satisfies ReportFinancialsData);
    };

    const numberOrNull = (value: string) => {
        const parsed = Number(value);

        return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<WalletCards className="size-5" />}
            title="Financial Utilization"
            description="Record budget allocation and utilization. Remaining balance and utilization rate update automatically."
            tone="green"
        >
            <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Allotted Budget
                        </span>
                        <input
                            type="number"
                            min={0}
                            value={data.allocatedBudget ?? ''}
                            onChange={(event) =>
                                updateFinancials({
                                    allocatedBudget: numberOrNull(
                                        event.target.value,
                                    ),
                                    usedBudget: data.usedBudget,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="0.00"
                        />
                        <span className="mt-1 block text-xs text-[#99a1af]">
                            Approved or allotted budget for the project
                        </span>
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Released Amount
                        </span>
                        <input
                            type="number"
                            min={0}
                            value={data.releasedAmount ?? ''}
                            onChange={(event) =>
                                updateFinancials({
                                    releasedAmount: numberOrNull(
                                        event.target.value,
                                    ),
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="0.00"
                        />
                        <span className="mt-1 block text-xs text-[#99a1af]">
                            Amount released to the implementing agency
                        </span>
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Obligated Amount
                        </span>
                        <input
                            type="number"
                            min={0}
                            value={data.obligatedAmount ?? ''}
                            onChange={(event) =>
                                updateFinancials({
                                    obligatedAmount: numberOrNull(
                                        event.target.value,
                                    ),
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="0.00"
                        />
                        <span className="mt-1 block text-xs text-[#99a1af]">
                            Committed amount for contracts or payable items
                        </span>
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Utilized / Disbursed Amount
                        </span>
                        <input
                            type="number"
                            min={0}
                            value={data.usedBudget ?? ''}
                            onChange={(event) =>
                                updateFinancials({
                                    allocatedBudget: data.allocatedBudget,
                                    usedBudget: numberOrNull(
                                        event.target.value,
                                    ),
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="0.00"
                        />
                        {errors.usedBudget?.message ? (
                            <span className="mt-1 block text-xs text-[#fb2c36]">
                                {errors.usedBudget.message.toString()}
                            </span>
                        ) : (
                            <span className="mt-1 block text-xs text-[#99a1af]">
                                Actual utilized or disbursed amount
                            </span>
                        )}
                    </label>
                </div>

                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        Financial As-of Date
                    </span>
                    <input
                        type="date"
                        value={data.financialAsOfDate}
                        onChange={(event) =>
                            updateFinancials({
                                financialAsOfDate: event.target.value,
                            })
                        }
                        className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                    {errors.financialAsOfDate?.message ? (
                        <span className="mt-1 block text-xs text-[#fb2c36]">
                            {errors.financialAsOfDate.message.toString()}
                        </span>
                    ) : (
                        <span className="mt-1 block text-xs text-[#99a1af]">
                            Date covered by the financial figures
                        </span>
                    )}
                </label>

                {warnings.length > 0 ? (
                    <div className="space-y-2 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] p-3">
                        {warnings.map((warning) => (
                            <div
                                key={warning}
                                className="flex gap-2 text-xs font-medium text-[#92400e]"
                            >
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                    <FinancialSummaryCard
                        label="Remaining Balance"
                        value={
                            data.remainingBalance === null
                                ? 'Not provided'
                                : formatPeso(data.remainingBalance)
                        }
                        tone={
                            data.remainingBalance !== null &&
                            data.remainingBalance < 0
                                ? 'red'
                                : 'blue'
                        }
                    />
                    <FinancialSummaryCard
                        label="Budget Utilization"
                        value={
                            data.utilizationRate === null
                                ? 'Not available'
                                : `${data.utilizationRate}%`
                        }
                        tone={data.financialValidated ? 'green' : 'violet'}
                    />
                </div>
            </div>
        </ReportStepLayout>
    );
}
