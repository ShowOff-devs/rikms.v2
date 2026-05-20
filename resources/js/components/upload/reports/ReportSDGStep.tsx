import { Globe2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import SDGGrid from '@/components/upload/shared/SDGGrid';
import type { ReportSDGTaggingData } from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function ReportSDGStep(props: UploadWizardStepProps) {
    const { stepData, setStepData } = props;
    const data = stepData as ReportSDGTaggingData;

    const updateSDGTagging = (updates: Partial<ReportSDGTaggingData>) => {
        setStepData({
            ...data,
            ...updates,
            sdgSelectionValidated:
                (updates.selectedSDGs ?? data.selectedSDGs).length > 0,
        } satisfies ReportSDGTaggingData);
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<Globe2 className="size-5" />}
            title="SDG Tagging"
            description="Assign Sustainable Development Goals for repository classification, analytics, and public filtering."
            tone="green"
        >
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#ddd6fe] bg-[#f5f3ff] p-4">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-bold text-[#7c3aed]">
                            <Sparkles className="size-4" />
                            AI suggested SDG{' '}
                            {data.aiSuggestedSDGs.join(', SDG ')}
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            These are pre-selected recommendations. You can add
                            or remove goals before review.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-[14px] border-[#ddd6fe] text-[#7c3aed]"
                        onClick={() =>
                            updateSDGTagging({
                                selectedSDGs: data.aiSuggestedSDGs,
                                aiSuggestionsApplied: true,
                            })
                        }
                    >
                        Apply Suggestions
                    </Button>
                </div>

                <SDGGrid
                    selectedSDGs={data.selectedSDGs}
                    suggestedSDGs={data.aiSuggestedSDGs}
                    onChange={(selectedSDGs) =>
                        updateSDGTagging({ selectedSDGs })
                    }
                />

                <div className="rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm text-[#1e3a8a]">
                    Selected SDGs will feed repository filters, regional
                    analytics, public categorization, and reporting dashboards.
                </div>
            </div>
        </ReportStepLayout>
    );
}
