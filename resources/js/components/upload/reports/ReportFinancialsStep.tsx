import { WalletCards } from 'lucide-react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import FinancialSummaryCard from '@/components/upload/shared/FinancialSummaryCard';
import { calculateFinancials, formatPeso } from '@/lib/upload/report-workflow';
import type { ReportFinancialsData } from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function ReportFinancialsStep(props: UploadWizardStepProps) {
    const { stepData, setStepData, errors } = props;
    const data = stepData as ReportFinancialsData;

    const updateFinancials = (
        updates: Pick<ReportFinancialsData, 'allocatedBudget' | 'usedBudget'>,
    ) => {
        setStepData({
            ...data,
            ...updates,
            ...calculateFinancials(updates.allocatedBudget, updates.usedBudget),
        } satisfies ReportFinancialsData);
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
                            Allocated Budget
                        </span>
                        <input
                            type="number"
                            min={0}
                            value={data.allocatedBudget || ''}
                            onChange={(event) =>
                                updateFinancials({
                                    allocatedBudget: Number(event.target.value),
                                    usedBudget: data.usedBudget,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="0.00"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Used Budget
                        </span>
                        <input
                            type="number"
                            min={0}
                            value={data.usedBudget || ''}
                            onChange={(event) =>
                                updateFinancials({
                                    allocatedBudget: data.allocatedBudget,
                                    usedBudget: Number(event.target.value),
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="0.00"
                        />
                        {errors.usedBudget?.message ? (
                            <span className="mt-1 block text-xs text-[#fb2c36]">
                                {errors.usedBudget.message.toString()}
                            </span>
                        ) : null}
                    </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <FinancialSummaryCard
                        label="Remaining Balance"
                        value={formatPeso(data.remainingBalance)}
                        tone={data.remainingBalance < 0 ? 'red' : 'blue'}
                    />
                    <FinancialSummaryCard
                        label="Utilization Rate"
                        value={`${data.utilizationRate}%`}
                        tone={data.financialValidated ? 'green' : 'violet'}
                    />
                </div>
            </div>
        </ReportStepLayout>
    );
}
