import { FileText, Zap } from 'lucide-react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import FileUploader from '@/components/upload/shared/FileUploader';
import { apiMessage } from '@/lib/api-client';
import {
    REPORT_STEP_IDS,
    buildReportWorkflowData,
} from '@/lib/upload/report-workflow';
import {
    saveReportDraft,
    uploadReportFile,
} from '@/lib/upload/services/report-upload-service';
import {
    uploadLimitBytes,
    uploadLimitLabel,
    useEffectiveUploadLimitMb,
} from '@/lib/upload/upload-limits';
import type {
    ReportDetailsData,
    ReportDocumentType,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

const reportingPeriods = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'];

function getFileError(file: File, uploadLimitMb: number) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || extension !== 'pdf') {
        return 'Upload a PDF report document.';
    }

    if (file.size > uploadLimitBytes(uploadLimitMb)) {
        return `Maximum file size is ${uploadLimitLabel(uploadLimitMb)}.`;
    }

    return null;
}

export default function ReportDetailsStep(props: UploadWizardStepProps) {
    const { config, state, stepData, setStepData, errors } = props;
    const data = stepData as ReportDetailsData;
    const uploadLimitMb = useEffectiveUploadLimitMb();
    const uploadLimitText = uploadLimitLabel(uploadLimitMb);
    const fileError =
        data.uploadStatus === 'error'
            ? (data.uploadError ??
              `Upload a PDF file up to ${uploadLimitText}.`)
            : errors.uploadedFile?.message?.toString();

    const updateDetails = (updates: Partial<ReportDetailsData>) => {
        setStepData({
            ...data,
            ...updates,
        } satisfies ReportDetailsData);
    };

    const handleFile = async (file: File) => {
        const error = getFileError(file, uploadLimitMb);

        if (error) {
            updateDetails({
                uploadedFile: null,
                uploadedFileName: file.name,
                uploadedFileType: file.type,
                uploadedFileSize: file.size,
                uploadStatus: 'error',
                uploadError: error,
            });

            return;
        }

        const nextDetails: ReportDetailsData = {
            ...data,
            uploadedFile: file,
            uploadedFileName: file.name,
            uploadedFileType: file.type,
            uploadedFileSize: file.size,
            uploadStatus: 'uploading',
            uploadError: null,
        };

        updateDetails(nextDetails);

        try {
            const draft = await saveReportDraft(
                buildReportWorkflowData(config.type as ReportDocumentType, {
                    ...state.stepData,
                    [REPORT_STEP_IDS.details]: nextDetails,
                }),
            );
            const uploadedFile = await uploadReportFile(
                draft.id,
                file,
                config.type as ReportDocumentType,
            );

            setStepData({
                ...nextDetails,
                researchId: String(draft.id),
                serverUpdatedAt: draft.updated_at ?? null,
                serverDraftVersion: draft.report_detail?.draft_version ?? null,
                uploadedFileId: uploadedFile.id,
                uploadedFileName: uploadedFile.name,
                uploadedFileType: uploadedFile.type,
                uploadedFileSize: uploadedFile.size,
                uploadStatus: 'uploaded',
                uploadError: null,
            } satisfies ReportDetailsData);
        } catch (error) {
            setStepData({
                ...nextDetails,
                uploadedFile: null,
                uploadStatus: 'error',
                uploadError: apiMessage(
                    error,
                    'The upload failed. Try selecting the file again.',
                ),
            } satisfies ReportDetailsData);
        }
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<FileText className="size-5" />}
            title="Document Details"
            description="Upload your document file and provide basic information. AI will extract detailed metadata in the next step."
        >
            <div className="space-y-5">
                <FileUploader
                    accept=".pdf,application/pdf"
                    fileName={data.uploadedFileName}
                    helperText={
                        data.uploadStatus === 'uploading'
                            ? 'Uploading to RIKMS...'
                            : `PDF - Max ${uploadLimitText}`
                    }
                    error={fileError}
                    onFileSelect={handleFile}
                />

                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        Report Title
                    </span>
                    <input
                        value={data.reportTitle}
                        onChange={(event) =>
                            updateDetails({ reportTitle: event.target.value })
                        }
                        className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Manual title override (optional)..."
                    />
                    <span className="mt-1 block text-xs text-[#99a1af]">
                        Optional - AI will auto-detect from document content
                    </span>
                </label>

                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        Description
                    </span>
                    <textarea
                        value={data.reportDescription}
                        onChange={(event) =>
                            updateDetails({
                                reportDescription: event.target.value,
                            })
                        }
                        rows={3}
                        className="mt-2 w-full rounded-[10px] border border-[#d1d5dc] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        placeholder="Brief description of this submission..."
                    />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Project Start Date
                        </span>
                        <input
                            type="date"
                            value={data.projectStartDate}
                            onChange={(event) =>
                                updateDetails({
                                    projectStartDate: event.target.value,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Project End Date
                        </span>
                        <input
                            type="date"
                            value={data.projectEndDate}
                            onChange={(event) =>
                                updateDetails({
                                    projectEndDate: event.target.value,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        />
                        {errors.projectEndDate?.message ? (
                            <span className="mt-1 block text-xs text-[#fb2c36]">
                                {errors.projectEndDate.message.toString()}
                            </span>
                        ) : null}
                    </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Reporting Period
                            <span className="text-[#fb2c36]">*</span>
                        </span>
                        <select
                            value={data.reportingPeriod}
                            onChange={(event) =>
                                updateDetails({
                                    reportingPeriod: event.target.value,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        >
                            <option value="">Select period</option>
                            {reportingPeriods.map((period) => (
                                <option key={period} value={period}>
                                    {period}
                                </option>
                            ))}
                        </select>
                        {errors.reportingPeriod?.message ? (
                            <span className="mt-1 block text-xs text-[#fb2c36]">
                                {errors.reportingPeriod.message.toString()}
                            </span>
                        ) : null}
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Reporting Year
                            <span className="text-[#fb2c36]">*</span>
                        </span>
                        <input
                            type="number"
                            min={1900}
                            max={new Date().getFullYear() + 1}
                            value={data.reportingYear}
                            onChange={(event) =>
                                updateDetails({
                                    reportingYear: event.target.value,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            inputMode="numeric"
                        />
                    </label>
                </div>

                <label className="block">
                    <span className="text-sm font-semibold text-[#344054]">
                        Agency
                    </span>
                    <div className="mt-2 flex h-11 items-center justify-between rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 text-sm font-semibold text-[#1e3a8a]">
                        <span className="inline-flex items-center gap-2">
                            <Zap className="size-4" />
                            {data.agency}
                        </span>
                        <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px]">
                            Auto-filled
                        </span>
                    </div>
                </label>
            </div>
        </ReportStepLayout>
    );
}
