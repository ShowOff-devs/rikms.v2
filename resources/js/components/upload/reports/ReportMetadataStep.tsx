import { Brain, CheckCircle2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import MetadataLivePreview from '@/components/upload/shared/MetadataLivePreview';
import MetadataSectionCard from '@/components/upload/shared/MetadataSectionCard';
import {
    REPORT_STEP_IDS,
    metadataFieldLabels,
} from '@/lib/upload/report-workflow';
import { mockRunAIMetadataExtraction } from '@/lib/upload/services/mock-report-upload-service';
import type {
    ReportAIMetadataData,
    ReportDetailsData,
    ReportMetadataKey,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

const metadataKeys = Object.keys(metadataFieldLabels) as ReportMetadataKey[];

export default function ReportMetadataStep(props: UploadWizardStepProps) {
    const { state, stepData, setStepData } = props;
    const data = stepData as ReportAIMetadataData;
    const details = state.stepData[
        REPORT_STEP_IDS.details
    ] as ReportDetailsData;
    const [isRunning, setIsRunning] = useState(false);

    const updateAIMetadata = (updates: Partial<ReportAIMetadataData>) => {
        setStepData({
            ...data,
            ...updates,
        } satisfies ReportAIMetadataData);
    };

    const runAnalysis = async () => {
        setIsRunning(true);
        updateAIMetadata({
            aiAnalysisStarted: true,
            extractionStatus: 'running',
        });

        try {
            const result = await mockRunAIMetadataExtraction(details);

            setStepData({
                ...data,
                aiAnalysisStarted: true,
                aiAnalysisCompleted: true,
                extractionStatus: 'success',
                extractedMetadata: result.extractedMetadata,
                selectedPublicMetadata: result.selectedPublicMetadata,
                aiGeneratedFields: result.aiGeneratedFields,
                userEditedFields: [],
                metadataValidated: true,
            } satisfies ReportAIMetadataData);
        } catch {
            updateAIMetadata({
                extractionStatus: 'error',
                aiAnalysisCompleted: false,
            });
        } finally {
            setIsRunning(false);
        }
    };

    const updateField = (key: ReportMetadataKey, value: string) => {
        const nextValue =
            key === 'keywords' || key === 'authors'
                ? value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                : value;

        updateAIMetadata({
            extractedMetadata: {
                ...data.extractedMetadata,
                [key]: nextValue,
            },
            userEditedFields: data.userEditedFields.includes(key)
                ? data.userEditedFields
                : [...data.userEditedFields, key],
            metadataValidated: true,
        });
    };

    const togglePublic = (key: ReportMetadataKey) => {
        updateAIMetadata({
            selectedPublicMetadata: data.selectedPublicMetadata.includes(key)
                ? data.selectedPublicMetadata.filter((item) => item !== key)
                : [...data.selectedPublicMetadata, key],
        });
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<Brain className="size-5" />}
            title="Auto-Detected Metadata"
            description="Use AI-assisted analysis to extract structured metadata, then review public display fields."
            tone="violet"
        >
            {!data.aiAnalysisCompleted ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#ddd6fe] bg-[#f8f5ff] px-6 text-center">
                    <div className="flex size-16 items-center justify-center rounded-[18px] bg-[#ede9fe] text-[#7c3aed]">
                        <Sparkles className="size-8" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-[#101828]">
                        Ready to Analyze Document
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#6a7282]">
                        AI will read the uploaded report and prepare editable
                        metadata sections for repository publication.
                    </p>
                    <Button
                        type="button"
                        className="mt-6 h-11 rounded-[14px] bg-[#7c3aed] px-5 text-white hover:bg-[#6d28d9]"
                        disabled={isRunning || !details?.uploadedFileName}
                        onClick={runAnalysis}
                    >
                        <Sparkles className="size-4" />
                        {isRunning ? 'Analyzing...' : 'Run AI Analysis'}
                    </Button>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="space-y-4">
                        <div className="rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-sm text-[#008236]">
                            <div className="flex items-center gap-2 font-semibold">
                                <CheckCircle2 className="size-5" />
                                Metadata extraction completed
                            </div>
                            <p className="mt-1 text-xs text-[#008236]/75">
                                Review each section and choose what appears in
                                the public repository preview.
                            </p>
                        </div>
                        {metadataKeys.map((key) => (
                            <MetadataSectionCard
                                key={key}
                                fieldKey={key}
                                metadata={data}
                                onValueChange={updateField}
                                onVisibilityToggle={togglePublic}
                            />
                        ))}
                    </div>
                    <MetadataLivePreview metadata={data} />
                </div>
            )}
        </ReportStepLayout>
    );
}
