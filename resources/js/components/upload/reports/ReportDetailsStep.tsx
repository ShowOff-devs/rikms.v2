import { FileText, Zap } from 'lucide-react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import FileUploader from '@/components/upload/shared/FileUploader';
import { mockUploadDocument } from '@/lib/upload/services/mock-report-upload-service';
import type { ReportDetailsData } from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

function getFileError(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !['pdf', 'docx', 'doc'].includes(extension)) {
        return 'Supported formats are PDF, DOCX, and DOC.';
    }

    if (file.size > 50 * 1024 * 1024) {
        return 'Maximum file size is 50 MB.';
    }

    return null;
}

export default function ReportDetailsStep(props: UploadWizardStepProps) {
    const { stepData, setStepData, errors } = props;
    const data = stepData as ReportDetailsData;
    const fileError =
        data.uploadStatus === 'error'
            ? 'Upload a PDF, DOCX, or DOC file up to 50 MB.'
            : errors.uploadedFile?.message?.toString();

    const updateDetails = (updates: Partial<ReportDetailsData>) => {
        setStepData({
            ...data,
            ...updates,
        } satisfies ReportDetailsData);
    };

    const handleFile = async (file: File) => {
        const error = getFileError(file);

        if (error) {
            updateDetails({
                uploadedFile: null,
                uploadedFileName: file.name,
                uploadedFileType: file.type,
                uploadedFileSize: file.size,
                uploadStatus: 'error',
            });

            return;
        }

        const nextDetails: ReportDetailsData = {
            ...data,
            uploadedFile: file,
            uploadedFileName: file.name,
            uploadedFileType: file.type,
            uploadedFileSize: file.size,
            uploadStatus: 'uploaded',
        };

        updateDetails(nextDetails);
        await mockUploadDocument(nextDetails);
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
                    accept=".pdf,.doc,.docx,application/pdf"
                    fileName={data.uploadedFileName}
                    helperText="PDF - DOCX - DOC - Max 50 MB"
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
                            Quarter<span className="text-[#fb2c36]">*</span>
                        </span>
                        <select
                            value={data.reportingQuarter}
                            onChange={(event) =>
                                updateDetails({
                                    reportingQuarter: event.target.value,
                                })
                            }
                            className="mt-2 h-11 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        >
                            <option value="">Select quarter</option>
                            {quarters.map((quarter) => (
                                <option key={quarter} value={quarter}>
                                    {quarter}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-[#344054]">
                            Year<span className="text-[#fb2c36]">*</span>
                        </span>
                        <input
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
