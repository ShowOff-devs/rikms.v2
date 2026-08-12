import { Star, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import CharacterCounter from '@/components/upload/shared/CharacterCounter';
import FileUploader from '@/components/upload/shared/FileUploader';
import { apiMessage } from '@/lib/api-client';
import {
    REPORT_STEP_IDS,
    buildReportWorkflowData,
} from '@/lib/upload/report-workflow';
import {
    removeReportFile,
    reportHighlightFileError,
    saveReportDraft,
    uploadReportHighlightFile,
} from '@/lib/upload/services/report-upload-service';
import { useEffectiveUploadLimitMb } from '@/lib/upload/upload-limits';
import { cn } from '@/lib/utils';
import type {
    ReportDetailsData,
    ReportDocumentType,
    ReportHighlightsData,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function ReportHighlightsStep(props: UploadWizardStepProps) {
    const { config, state, stepData, setStepData, setWorkflowStepData } = props;
    const data = stepData as ReportHighlightsData;
    const [uploading, setUploading] = useState(false);
    const supportingFileMaxMb = Math.min(useEffectiveUploadLimitMb(20), 20);

    const updateHighlights = (updates: Partial<ReportHighlightsData>) => {
        setStepData({
            ...data,
            ...updates,
        } satisfies ReportHighlightsData);
    };

    const addSupportingFile = async (file: File) => {
        const fileError = reportHighlightFileError(
            file,
            data.supportingFiles.length,
            supportingFileMaxMb * 1024 * 1024,
        );

        if (fileError) {
            updateHighlights({ uploadError: fileError });

            return;
        }

        if (
            !data.highlightTitle.trim() ||
            data.highlightDescription.trim().length < 40
        ) {
            updateHighlights({
                uploadError:
                    'Enter the highlight title and a 40-character description before adding files.',
            });

            return;
        }

        setUploading(true);
        updateHighlights({ uploadError: null });

        try {
            const workflow = buildReportWorkflowData(
                config.type as ReportDocumentType,
                {
                    ...state.stepData,
                    [REPORT_STEP_IDS.highlights]: data,
                },
            );
            workflow.details.lastWizardStep = REPORT_STEP_IDS.highlights;
            const draft = await saveReportDraft(workflow);
            const highlight = draft.report_highlights?.[0];

            if (!highlight?.id) {
                throw new Error('Save the highlight before uploading files.');
            }

            const attachment = await uploadReportHighlightFile(
                draft.id,
                highlight.id,
                file,
            );
            const details = state.stepData[
                REPORT_STEP_IDS.details
            ] as ReportDetailsData;

            setWorkflowStepData(REPORT_STEP_IDS.details, {
                ...details,
                researchId: String(draft.id),
                serverUpdatedAt: draft.updated_at ?? null,
                serverDraftVersion: draft.report_detail?.draft_version ?? null,
            } satisfies ReportDetailsData);
            setStepData({
                ...data,
                highlightId: String(highlight.id),
                supportingFiles: [...data.supportingFiles, attachment],
                uploadError: null,
            } satisfies ReportHighlightsData);
            window.history.replaceState(
                window.history.state,
                '',
                `/agency/upload/terminal-report/${draft.id}`,
            );
        } catch (error) {
            updateHighlights({
                uploadError: apiMessage(
                    error,
                    'Unable to upload the supporting file.',
                ),
            });
        } finally {
            setUploading(false);
        }
    };

    const removeSupportingFile = async (fileId: string) => {
        const details = state.stepData[
            REPORT_STEP_IDS.details
        ] as ReportDetailsData;

        if (!details.researchId) {
            return;
        }

        setUploading(true);

        try {
            await removeReportFile(details.researchId, fileId);
            updateHighlights({
                supportingFiles: data.supportingFiles.filter(
                    (file) => file.id !== fileId,
                ),
                uploadError: null,
            });
        } catch (error) {
            updateHighlights({
                uploadError: apiMessage(
                    error,
                    'Unable to remove the supporting file.',
                ),
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<Star className="size-5" />}
            title="Highlights / Initiatives"
            description="Capture key accomplishments, success stories, major initiatives, and notable outcomes."
            tone="green"
        >
            <div className="space-y-5">
                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        Highlight Title
                    </span>
                    <input
                        value={data.highlightTitle}
                        onChange={(event) =>
                            updateHighlights({
                                highlightTitle: event.target.value,
                            })
                        }
                        className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        Description
                    </span>
                    <textarea
                        value={data.highlightDescription}
                        onChange={(event) =>
                            updateHighlights({
                                highlightDescription: event.target.value,
                            })
                        }
                        rows={6}
                        className="mt-2 w-full rounded-[10px] border border-[#d1d5dc] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                    <div className="mt-1">
                        <CharacterCounter
                            value={data.highlightDescription}
                            min={40}
                        />
                    </div>
                </label>

                <FileUploader
                    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                    helperText={`PNG - JPG - PDF - Max ${supportingFileMaxMb} MB`}
                    fileName={
                        data.supportingFiles.length > 0
                            ? `${data.supportingFiles.length} supporting file(s) selected`
                            : undefined
                    }
                    onFileSelect={addSupportingFile}
                />
                <p className="-mt-3 text-xs text-[#6a7282]">
                    Up to 5 files, maximum {supportingFileMaxMb} MB each. Every
                    file is signature-validated, quarantined, and
                    malware-scanned before storage.
                </p>
                {data.uploadError ? (
                    <p
                        role="alert"
                        className="text-xs font-medium text-[#b91c1c]"
                    >
                        {data.uploadError}
                    </p>
                ) : null}
                {uploading ? (
                    <p className="text-xs font-medium text-[#1e3a8a]">
                        Processing supporting file…
                    </p>
                ) : null}

                <button
                    type="button"
                    onClick={() =>
                        updateHighlights({
                            featuredHighlight: !data.featuredHighlight,
                        })
                    }
                    className={cn(
                        'flex w-full items-center justify-between rounded-[14px] border p-4 text-left',
                        data.featuredHighlight
                            ? 'border-[#00a63e] bg-[#f0fdf4]'
                            : 'border-[#e5e7eb] bg-white',
                    )}
                >
                    <span>
                        <span className="block text-sm font-bold text-[#101828]">
                            Mark as Featured
                        </span>
                        <span className="mt-1 block text-xs text-[#6a7282]">
                            Featured highlights receive priority placement in
                            dashboards and public summaries.
                        </span>
                    </span>
                    <span
                        className={cn(
                            'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
                            data.featuredHighlight
                                ? 'bg-[#00a63e]'
                                : 'bg-[#d1d5dc]',
                        )}
                    >
                        <span
                            className={cn(
                                'size-4 rounded-full bg-white transition-transform',
                                data.featuredHighlight && 'translate-x-5',
                            )}
                        />
                    </span>
                </button>

                {data.supportingFiles.length > 0 ? (
                    <div className="rounded-[14px] border border-[#e5e7eb] p-4">
                        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#101828]">
                            <Upload className="size-4" />
                            Supporting files
                        </p>
                        <div className="space-y-1">
                            {data.supportingFiles.map((file) => (
                                <div
                                    key={`${file.name}-${file.size}`}
                                    className="flex items-center justify-between gap-3 text-xs text-[#6a7282]"
                                >
                                    <span>{file.name}</span>
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={() =>
                                            void removeSupportingFile(file.id)
                                        }
                                        aria-label={`Remove ${file.name}`}
                                        className="rounded p-1 text-[#b91c1c] hover:bg-[#fff1f2]"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </ReportStepLayout>
    );
}
