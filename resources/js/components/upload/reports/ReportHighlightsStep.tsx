import { Star, Upload } from 'lucide-react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import CharacterCounter from '@/components/upload/shared/CharacterCounter';
import FileUploader from '@/components/upload/shared/FileUploader';
import { cn } from '@/lib/utils';
import type { ReportHighlightsData } from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

function isAllowedSupportingFile(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    return Boolean(
        extension && ['png', 'jpg', 'jpeg', 'pdf'].includes(extension),
    );
}

export default function ReportHighlightsStep(props: UploadWizardStepProps) {
    const { stepData, setStepData } = props;
    const data = stepData as ReportHighlightsData;

    const updateHighlights = (updates: Partial<ReportHighlightsData>) => {
        setStepData({
            ...data,
            ...updates,
        } satisfies ReportHighlightsData);
    };

    const addSupportingFile = (file: File) => {
        if (!isAllowedSupportingFile(file) || file.size > 20 * 1024 * 1024) {
            return;
        }

        updateHighlights({
            supportingFiles: [...data.supportingFiles, file],
        });
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
                    helperText="PNG - JPG - PDF - Max 20 MB"
                    fileName={
                        data.supportingFiles.length > 0
                            ? `${data.supportingFiles.length} supporting file(s) selected`
                            : undefined
                    }
                    onFileSelect={addSupportingFile}
                />

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
                                <p
                                    key={`${file.name}-${file.size}`}
                                    className="text-xs text-[#6a7282]"
                                >
                                    {file.name}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </ReportStepLayout>
    );
}
