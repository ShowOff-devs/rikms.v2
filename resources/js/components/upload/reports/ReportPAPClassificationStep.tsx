import { Layers3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import TagSelector from '@/components/upload/shared/TagSelector';
import {
    beneficiarySectorOptions,
    papCategoryOptions,
} from '@/lib/upload/report-workflow';
import type {
    BeneficiarySector,
    ReportPAPClassificationData,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function ReportPAPClassificationStep(
    props: UploadWizardStepProps,
) {
    const { stepData, setStepData } = props;
    const data = stepData as ReportPAPClassificationData;

    const updatePAPClassification = (
        updates: Partial<ReportPAPClassificationData>,
    ) => {
        setStepData({
            ...data,
            ...updates,
        } satisfies ReportPAPClassificationData);
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<Layers3 className="size-5" />}
            title="PAP Classification"
            description="Classify the report under applicable programs, activities, and projects with beneficiary sectors."
            tone="violet"
        >
            <div className="space-y-5">
                <div className="rounded-[14px] border border-[#ddd6fe] bg-[#f5f3ff] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-[#7c3aed]">
                                <Sparkles className="size-4" />
                                AI Suggestion
                            </p>
                            <p className="mt-1 text-xs text-[#6a7282]">
                                Recommended categories from extracted metadata:{' '}
                                {data.aiSuggestedPAPCategories.join(', ')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="rounded-[14px] bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                            onClick={() =>
                                updatePAPClassification({
                                    papCategories:
                                        data.aiSuggestedPAPCategories,
                                    aiSuggestionApplied: true,
                                })
                            }
                        >
                            Apply AI Suggestion
                        </Button>
                    </div>
                </div>

                <section>
                    <h3 className="mb-3 text-sm font-bold text-[#101828]">
                        PAP Categories
                    </h3>
                    <TagSelector
                        options={papCategoryOptions.map((category) => ({
                            value: category,
                            label: category,
                        }))}
                        selected={data.papCategories}
                        onChange={(papCategories) =>
                            updatePAPClassification({ papCategories })
                        }
                        tone="violet"
                    />
                </section>

                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        PAP Description
                    </span>
                    <textarea
                        value={data.papDescription}
                        onChange={(event) =>
                            updatePAPClassification({
                                papDescription: event.target.value,
                            })
                        }
                        rows={5}
                        className="mt-2 w-full rounded-[10px] border border-[#d1d5dc] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </label>

                <section>
                    <h3 className="mb-3 text-sm font-bold text-[#101828]">
                        Beneficiary Sectors (Pentahelix)
                    </h3>
                    <TagSelector<BeneficiarySector>
                        options={beneficiarySectorOptions}
                        selected={data.beneficiarySectors}
                        onChange={(beneficiarySectors) =>
                            updatePAPClassification({ beneficiarySectors })
                        }
                        tone="blue"
                    />
                </section>
            </div>
        </ReportStepLayout>
    );
}
