import {
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    PenLine,
    Save,
    Send,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ConfirmationModal from '@/components/upload/shared/ConfirmationModal';
import ReportPreviewCard from '@/components/upload/shared/ReportPreviewCard';
import {
    REPORT_STEP_IDS,
    buildReportWorkflowData,
    formatPeso,
    getReportTypeLabel,
    metadataFieldLabels,
    sdgOptions,
} from '@/lib/upload/report-workflow';
import {
    createSubmittedReviewState,
    mockSaveDraft,
    mockSubmitDocument,
} from '@/lib/upload/services/mock-report-upload-service';
import type {
    ReportDocumentType,
    ReportReviewData,
    ReportWorkflowData,
} from '@/types/upload/reportWorkflow';
import type { UploadStepId, UploadWizardStepProps } from '@/types/uploadWizard';

type ReviewSectionProps = {
    title: string;
    stepId: UploadStepId;
    children: ReactNode;
    onEdit: (stepId: UploadStepId) => void;
};

function ReviewSection({
    title,
    stepId,
    children,
    onEdit,
}: ReviewSectionProps) {
    return (
        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb]">
            <header className="flex items-center justify-between bg-[#f8faff] px-4 py-3">
                <h3 className="text-sm font-bold text-[#101828]">{title}</h3>
                <button
                    type="button"
                    onClick={() => onEdit(stepId)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a8a]"
                >
                    <PenLine className="size-3.5" />
                    Edit
                </button>
            </header>
            <div className="p-4">{children}</div>
        </section>
    );
}

function ReviewItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                {label}
            </p>
            <div className="mt-1 text-sm leading-5 text-[#4a5565]">{value}</div>
        </div>
    );
}

function SuccessState({ data }: { data: ReportWorkflowData }) {
    return (
        <div className="flex min-h-[520px] items-center justify-center">
            <section className="w-full max-w-xl rounded-[18px] border border-[#bbf7d0] bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#00c950] text-white">
                    <CheckCircle2 className="size-9" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-[#101828]">
                    Report Submitted Successfully
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#6a7282]">
                    {data.details.reportTitle || 'Your report'} has been queued
                    for repository processing. Backend persistence will replace
                    this mock submission later.
                </p>
                <Button
                    type="button"
                    className="mt-6 rounded-[14px] bg-[#1e3a8a] text-white hover:bg-[#172f70]"
                >
                    <ExternalLink className="size-4" />
                    View Submission Queue
                </Button>
            </section>
        </div>
    );
}

export default function ReportReviewStep(props: UploadWizardStepProps) {
    const { config, state, stepData, setStepData, goBack, goToStep } = props;
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const data = buildReportWorkflowData(
        config.type as ReportDocumentType,
        state.stepData,
    );
    const review = stepData as ReportReviewData;

    const allValid = useMemo(
        () =>
            config.steps.every((step) => {
                if (step.id === REPORT_STEP_IDS.review || !step.schema) {
                    return true;
                }

                return step.schema.safeParse(state.stepData[step.id]).success;
            }),
        [config.steps, state.stepData],
    );

    const updateReview = (updates: Partial<ReportReviewData>) => {
        setStepData({
            ...review,
            ...updates,
        } satisfies ReportReviewData);
    };

    const saveDraft = async () => {
        await mockSaveDraft(data);
        updateReview({
            draftStatus: 'saved',
            submissionStatus: 'draft',
        });
    };

    const submit = async () => {
        setSubmitting(true);
        updateReview({
            reviewStatus: 'reviewed',
            submissionStatus: 'pending',
        });

        const result = await mockSubmitDocument(data);

        setStepData(createSubmittedReviewState(result.submittedAt));
        setSubmitting(false);
        setConfirmOpen(false);
    };

    if (review.submissionStatus === 'submitted') {
        return <SuccessState data={data} />;
    }

    return (
        <div className="flex items-start gap-5">
            <section className="min-w-0 flex-1 rounded-[14px] border border-[#e5e7eb] bg-white p-7 shadow-sm">
                <div className="mb-5 flex gap-4 border-b border-[#f3f4f6] pb-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f0fdf4] text-[#00a63e]">
                        <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-[16.8px] leading-[25.2px] font-bold text-[#101828]">
                            Review Submission
                        </h2>
                        <p className="mt-1 text-sm leading-[22.75px] text-[#6a7282]">
                            Verify all information before submitting to the
                            RIKMS repository workflow.
                        </p>
                    </div>
                </div>

                <div className="mb-5 rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#008236]">
                            <CheckCircle2 className="size-5" />
                            {allValid
                                ? 'Validation - All checks passed'
                                : 'Validation - Some sections need attention'}
                        </div>
                        <span className="text-xs text-[#6a7282]">
                            {allValid ? 'Ready' : 'Incomplete'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <ReviewSection
                        title="Document Information"
                        stepId={REPORT_STEP_IDS.details}
                        onEdit={goToStep}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <ReviewItem
                                label="Type"
                                value={getReportTypeLabel(data.documentType)}
                            />
                            <ReviewItem
                                label="File"
                                value={
                                    data.details.uploadedFileName ??
                                    'No file selected'
                                }
                            />
                            <ReviewItem
                                label="Title"
                                value={data.details.reportTitle}
                            />
                            <ReviewItem
                                label="Period"
                                value={`${data.details.reportingQuarter} ${data.details.reportingYear}`}
                            />
                        </div>
                    </ReviewSection>

                    <ReviewSection
                        title="AI Metadata"
                        stepId={REPORT_STEP_IDS.aiMetadata}
                        onEdit={goToStep}
                    >
                        <ReviewItem
                            label="Public fields"
                            value={data.aiMetadata.selectedPublicMetadata
                                .map((key) => metadataFieldLabels[key])
                                .join(', ')}
                        />
                    </ReviewSection>

                    <ReviewSection
                        title="Performance and Financials"
                        stepId={REPORT_STEP_IDS.performance}
                        onEdit={goToStep}
                    >
                        <div className="grid gap-4 md:grid-cols-3">
                            <ReviewItem
                                label="Project rows"
                                value={
                                    data.performance.performanceProjects.length
                                }
                            />
                            <ReviewItem
                                label="Allocated"
                                value={formatPeso(
                                    data.financials.allocatedBudget,
                                )}
                            />
                            <ReviewItem
                                label="Used"
                                value={formatPeso(data.financials.usedBudget)}
                            />
                        </div>
                    </ReviewSection>

                    <ReviewSection
                        title="PAP, Highlights, and SDGs"
                        stepId={REPORT_STEP_IDS.papClassification}
                        onEdit={goToStep}
                    >
                        <div className="space-y-4">
                            <ReviewItem
                                label="PAP Categories"
                                value={data.papClassification.papCategories.join(
                                    ', ',
                                )}
                            />
                            <ReviewItem
                                label="Featured Highlight"
                                value={
                                    data.highlights.featuredHighlight
                                        ? data.highlights.highlightTitle
                                        : 'Not featured'
                                }
                            />
                            <div className="flex flex-wrap gap-2">
                                {data.sdgTagging.selectedSDGs.map((id) => {
                                    const sdg = sdgOptions.find(
                                        (option) => option.id === id,
                                    );

                                    return (
                                        <span
                                            key={id}
                                            className="rounded-[10px] px-3 py-2 text-xs font-bold text-white"
                                            style={{
                                                backgroundColor:
                                                    sdg?.color ?? '#1e3a8a',
                                            }}
                                        >
                                            SDG {id} - {sdg?.name}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </ReviewSection>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-[14px] border-[#e5e7eb] text-[#4a5565]"
                        onClick={goBack}
                    >
                        <ArrowLeft className="size-4" />
                        Previous
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span className="text-xs font-medium text-[#99a1af]">
                            9 / 9
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-[14px] border-[#e5e7eb]"
                            onClick={saveDraft}
                        >
                            <Save className="size-4" />
                            Save as Draft
                        </Button>
                        <Button
                            type="button"
                            className="h-10 rounded-[14px] bg-[#00a63e] px-5 text-white hover:bg-[#008236]"
                            disabled={!allValid}
                            onClick={() => setConfirmOpen(true)}
                        >
                            <Send className="size-4" />
                            Submit Report
                        </Button>
                    </div>
                </div>
            </section>

            <ReportPreviewCard
                data={data}
                steps={config.steps}
                activeStepId={REPORT_STEP_IDS.review}
            />

            <ConfirmationModal
                open={confirmOpen}
                title="Submit Report?"
                description="This will submit the document and selected metadata to the RIKMS repository workflow. This is a frontend mock and no backend record will be created yet."
                confirmLabel="Confirm Submission"
                isSubmitting={submitting}
                onOpenChange={setConfirmOpen}
                onConfirm={submit}
            >
                <div className="rounded-[12px] bg-[#f9fafb] p-4 text-sm text-[#4a5565]">
                    <p className="font-semibold text-[#101828]">
                        {data.details.reportTitle || 'Untitled Report'}
                    </p>
                    <p className="mt-1">
                        {getReportTypeLabel(data.documentType)} -{' '}
                        {data.sdgTagging.selectedSDGs.length} SDGs -{' '}
                        {data.performance.performanceProjects.length} project
                        rows
                    </p>
                </div>
            </ConfirmationModal>
        </div>
    );
}
