import { router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Brain,
    Calendar,
    Check,
    ChevronDown,
    ExternalLink,
    Eye,
    FileCheck2,
    FileText,
    Globe2,
    Info,
    LinkIcon,
    Lock,
    PenLine,
    Save,
    Send,
    Shield,
    Sparkles,
    Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getAgencyAiResults } from '@/lib/agency/agency-ai-results-service';
import {
    saveAgencyResearchDraft,
    submitAgencyResearch,
} from '@/lib/agency/agency-research-service';
import { uploadAgencyResearchFile } from '@/lib/agency/agency-upload-service';
import {
    accessOptions,
    createInitialUploadState,
    getAccessLabel,
    getDisplayTitle,
    getDocumentTypeLabel,
    metadataFieldsTemplate,
    sdgOptions,
} from '@/lib/agency/upload-research-service';
import { apiMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type {
    AccessType,
    AgencyUploadState,
    MetadataField,
} from '@/types/agency-upload';

const steps = [
    { label: 'Doc Type', accent: '#1e3a8a' },
    { label: 'Upload', accent: '#1e3a8a' },
    { label: 'AI Metadata', accent: '#7c3aed' },
    { label: 'SDG Tagging', accent: '#0ea5e9' },
    { label: 'Access', accent: '#dc2626' },
    { label: 'Review', accent: '#059669' },
];

const toneClasses: Record<string, string> = {
    blue: 'bg-[#eff6ff] text-[#1e3a8a]',
    violet: 'bg-[#f5f3ff] text-[#7c3aed]',
    emerald: 'bg-[#ecfdf5] text-[#059669]',
    rose: 'bg-[#fff1f2] text-[#e11d48]',
    amber: 'bg-[#fffbeb] text-[#d97706]',
    cyan: 'bg-[#ecfeff] text-[#0891b2]',
};

function StepBadge({ step }: { step: number }) {
    return (
        <span className="rounded-full bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-bold text-white">
            STEP {step} OF 6
        </span>
    );
}

function WizardHeader({ currentStep }: { currentStep: number }) {
    return (
        <>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                        <span>Dashboard</span>
                        <span>/</span>
                        <span>Upload</span>
                        <span>/</span>
                        <span className="font-semibold text-[#1e3a8a]">
                            New Document
                        </span>
                    </div>
                    <h1 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                        Upload Document
                    </h1>
                    <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                        Submit research articles with automated metadata
                        extraction
                    </p>
                </div>
                <div className="hidden rounded-[10px] border border-[#bfdbfe] bg-white px-3 py-2 text-xs font-semibold text-[#1e3a8a] shadow-sm sm:flex">
                    <Sparkles className="mr-2 size-4" />
                    AI-Powered - 6-Step Wizard
                </div>
            </div>

            <div className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-wide text-[#99a1af] uppercase">
                        Research Study - Simplified Flow
                    </p>
                    <span className="rounded-full bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-bold text-white">
                        6 Steps
                    </span>
                </div>
                <div className="flex items-center">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isDone = currentStep > stepNumber;
                        const isCurrent = currentStep === stepNumber;
                        const color = isDone ? '#00c950' : step.accent;

                        return (
                            <div
                                key={step.label}
                                className="flex min-w-0 flex-1 items-center last:flex-none"
                            >
                                <div className="flex min-w-[56px] flex-col items-center gap-1">
                                    <span
                                        className={cn(
                                            'flex size-7 items-center justify-center rounded-full border text-xs font-semibold',
                                            isDone || isCurrent
                                                ? 'border-transparent text-white'
                                                : 'border-[#d1d5dc] bg-white text-[#99a1af]',
                                        )}
                                        style={{
                                            backgroundColor:
                                                isDone || isCurrent
                                                    ? color
                                                    : 'white',
                                        }}
                                    >
                                        {isDone ? (
                                            <Check className="size-4" />
                                        ) : (
                                            stepNumber
                                        )}
                                    </span>
                                    <span
                                        className="truncate text-[10px] font-medium"
                                        style={{
                                            color:
                                                isDone || isCurrent
                                                    ? color
                                                    : '#99a1af',
                                        }}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            'mx-2 h-0.5 min-w-6 flex-1',
                                            currentStep > stepNumber
                                                ? 'bg-[#00c950]'
                                                : 'bg-[#e5e7eb]',
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

function PreviewPanel({
    state,
    currentStep,
}: {
    state: AgencyUploadState;
    currentStep: number;
}) {
    const publicFields = state.metadata.filter((field) => field.isPublic);
    const title = getDisplayTitle(state);

    return (
        <aside className="hidden w-[270px] shrink-0 space-y-3 xl:block">
            <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                        <Eye className="size-4" />
                        Research Preview
                    </div>
                    <span className="text-[10px] font-medium text-[#1e3a8a]/60">
                        Step {currentStep}/6
                    </span>
                </div>
                <div className="space-y-4 p-4">
                    <div>
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-[#1e3a8a]">
                            <FileText className="size-3.5" />
                            {getDocumentTypeLabel(state.documentType)}
                        </div>
                        <h3 className="text-sm leading-[19.25px] font-semibold text-[#1e2939]">
                            {title}
                        </h3>
                        {state.file && (
                            <p className="mt-2 truncate text-[10px] text-[#99a1af]">
                                {state.file.name}
                            </p>
                        )}
                    </div>

                    {publicFields.length > 0 && (
                        <div className="rounded-[10px] border border-[#bfdbfe] bg-[#f8faff] p-3">
                            <p className="mb-2 flex items-center gap-1 text-[9px] font-bold tracking-wide text-[#1e3a8a] uppercase">
                                <Eye className="size-3" />
                                Public View
                            </p>
                            {publicFields.slice(0, 3).map((field) => (
                                <div key={field.key} className="mb-2">
                                    <p className="text-[9px] font-semibold text-[#99a1af] uppercase">
                                        {field.label}
                                    </p>
                                    <p className="line-clamp-2 text-[10px] leading-[13.75px] text-[#4a5565]">
                                        {field.value}
                                    </p>
                                </div>
                            ))}
                            {publicFields.length > 3 && (
                                <p className="text-[9px] font-medium text-[#1e3a8a]">
                                    +{publicFields.length - 3} more fields
                                    visible
                                </p>
                            )}
                        </div>
                    )}

                    {state.selectedSdgs.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-[9px] font-bold text-[#99a1af] uppercase">
                                SDG Tags
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {state.selectedSdgs.map((id) => {
                                    const sdg = sdgOptions.find(
                                        (option) => option.id === id,
                                    );

                                    return (
                                        <span
                                            key={id}
                                            className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                                            style={{
                                                backgroundColor:
                                                    sdg?.color ?? '#1e3a8a',
                                            }}
                                        >
                                            SDG {id}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 rounded-[10px] bg-[#eff6ff] p-2 text-[10px] font-semibold text-[#1e3a8a]">
                        <Globe2 className="size-3.5" />
                        {getAccessLabel(state.accessType)}
                    </div>

                    <div className="border-t border-[#f3f4f6] pt-2">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-[#99a1af] uppercase">
                                Readiness
                            </span>
                            <span className="text-[10px] font-bold text-[#1e3a8a]">
                                {readinessCount(state)}/5
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#f3f4f6]">
                            <div
                                className={cn(
                                    'h-full rounded-full',
                                    readinessCount(state) >= 5
                                        ? 'bg-[#00c950]'
                                        : 'bg-[#1e3a8a]',
                                )}
                                style={{
                                    width: `${(readinessCount(state) / 5) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <p className="mb-3 text-[9px] font-bold text-[#99a1af] uppercase">
                    6-Step Research Flow
                </p>
                <div className="space-y-1.5">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isDone = currentStep > stepNumber;
                        const isCurrent = currentStep === stepNumber;
                        const color = isDone ? '#00c950' : step.accent;

                        return (
                            <div
                                key={step.label}
                                className="flex items-center gap-2"
                            >
                                <span
                                    className={cn(
                                        'flex size-4 items-center justify-center rounded-full text-[9px] font-medium',
                                        isDone || isCurrent
                                            ? 'text-white'
                                            : 'bg-[#f3f4f6] text-[#99a1af]',
                                    )}
                                    style={{
                                        backgroundColor:
                                            isDone || isCurrent
                                                ? color
                                                : undefined,
                                    }}
                                >
                                    {isDone ? '✓' : stepNumber}
                                </span>
                                <span
                                    className="text-[11px] font-medium"
                                    style={{
                                        color:
                                            isDone || isCurrent
                                                ? color
                                                : '#d1d5dc',
                                    }}
                                >
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </aside>
    );
}

function WizardCard({
    icon,
    title,
    subtitle,
    step,
    children,
    tone = 'blue',
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    step: number;
    children: React.ReactNode;
    tone?: string;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-7 shadow-sm">
            <div className="flex gap-4 border-b border-[#f3f4f6] pb-5">
                <div
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[14px]',
                        toneClasses[tone],
                    )}
                >
                    {icon}
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[16.8px] leading-[25.2px] font-bold text-[#101828]">
                            {title}
                        </h2>
                        <StepBadge step={step} />
                    </div>
                    <p className="mt-1 text-sm leading-[22.75px] text-[#6a7282]">
                        {subtitle}
                    </p>
                </div>
            </div>
            <div className="pt-5">{children}</div>
        </section>
    );
}

function StepNavigation({
    currentStep,
    canContinue,
    onBack,
    onNext,
}: {
    currentStep: number;
    canContinue: boolean;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <div className="mt-4 flex items-center justify-between">
            <Button
                type="button"
                variant="outline"
                className="h-[42px] rounded-[14px] border-[#e5e7eb] text-[#4a5565]"
                disabled={currentStep < 2}
                onClick={onBack}
            >
                <ArrowLeft className="size-4" />
                Previous
            </Button>
            <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#99a1af]">
                    {currentStep} / 6
                </span>
                <Button
                    type="button"
                    className="h-10 rounded-[14px] bg-[#1e3a8a] px-5 text-white shadow-sm hover:bg-[#172f70] disabled:bg-[#e5e7eb] disabled:text-[#99a1af]"
                    disabled={!canContinue}
                    onClick={onNext}
                >
                    {currentStep === 5 ? 'Review & Submit' : 'Continue'}
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

function UploadStep({
    state,
    setState,
}: {
    state: AgencyUploadState;
    setState: React.Dispatch<React.SetStateAction<AgencyUploadState>>;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || extension !== 'pdf') {
            setUploadError('Upload a PDF research document.');
            setState((current) => ({
                ...current,
                file: null,
                uploadStatus: 'error',
            }));

            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            setUploadError('Maximum file size is 20 MB.');
            setState((current) => ({
                ...current,
                file: null,
                uploadStatus: 'error',
            }));

            return;
        }

        setUploadError(null);
        setState((current) => ({
            ...current,
            uploadStatus: 'uploading',
        }));

        try {
            const draft = await saveAgencyResearchDraft({
                ...state,
                file: {
                    name: file.name,
                    size: file.size,
                    type: file.type || 'application/pdf',
                },
            });
            const uploadedFile = await uploadAgencyResearchFile(
                draft.id,
                file,
                state,
            );

            setState((current) => ({
                ...current,
                file: uploadedFile,
                researchId: String(draft.id),
                uploadStatus: 'uploaded',
            }));
        } catch (error) {
            setUploadError(
                apiMessage(error, 'The upload failed. Try selecting the file again.'),
            );
            setState((current) => ({
                ...current,
                file: null,
                uploadStatus: 'error',
            }));
        }
    };

    return (
        <WizardCard
            icon={<Upload className="size-5" />}
            title="Upload Research Document"
            subtitle="Upload your document. AI will automatically extract title, abstract, methodology, authors, and more in the next step."
            step={2}
        >
            <div
                className="flex min-h-[300px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#d1d5dc] bg-white p-8 text-center"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                    event.preventDefault();
                    void handleFile(event.dataTransfer.files[0]);
                }}
            >
                <div className="flex size-16 items-center justify-center rounded-[14px] bg-[#e9edf5] text-[#1e3a8a]">
                    <Upload className="size-8" />
                </div>
                <p className="mt-5 text-base font-semibold text-[#1e2939]">
                    Drag & drop your document here
                </p>
                <p className="my-3 text-xs text-[#d1d5dc]">or</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) =>
                        void handleFile(event.target.files?.[0])
                    }
                />
                <Button
                    type="button"
                    className="h-11 rounded-[14px] bg-[#1e3a8a] px-6 text-white hover:bg-[#172f70]"
                    onClick={() => inputRef.current?.click()}
                    disabled={state.uploadStatus === 'uploading'}
                >
                    <Upload className="size-4" />
                    {state.uploadStatus === 'uploading'
                        ? 'Uploading...'
                        : 'Browse File'}
                </Button>
                <div className="mt-5 flex items-center gap-3 text-xs text-[#99a1af]">
                    <span className="rounded bg-[#f3f4f6] px-2 py-0.5">
                        PDF
                    </span>
                    <span>-</span>
                    <span className="rounded bg-[#f3f4f6] px-2 py-0.5">
                        DOCX
                    </span>
                    <span>-</span>
                    <span className="rounded bg-[#f3f4f6] px-2 py-0.5">
                        DOC
                    </span>
                    <span>-</span>
                    <span>Max 50 MB</span>
                </div>
                {state.file && (
                    <div className="mt-5 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-2 text-sm font-semibold text-[#1e3a8a]">
                        {state.file.name}
                    </div>
                )}
                {uploadError && (
                    <p className="mt-3 text-xs font-semibold text-[#dc2626]">
                        {uploadError}
                    </p>
                )}
            </div>
            <label className="mt-5 block">
                <span className="text-sm font-semibold text-[#364153]">
                    Research Title
                </span>
                <Input
                    value={state.manualTitle}
                    onChange={(event) =>
                        setState((current) => ({
                            ...current,
                            manualTitle: event.target.value,
                        }))
                    }
                    className="mt-2 h-[42px] rounded-[14px] border-[#e5e7eb] bg-[#f9fafb]"
                    placeholder="Manual title override (optional)..."
                />
                <span className="mt-1 block text-[11px] text-[#99a1af]">
                    Optional - AI will auto-detect the title from document
                    content
                </span>
            </label>
            <div className="mt-5 rounded-[14px] border border-[#e9d4ff] bg-[#f5f3ff] p-4 text-xs text-[#6e11b0]">
                <Sparkles className="mr-2 inline size-4" />
                <strong>AI-Powered Extraction</strong> - The AI engine will
                auto-detect title, abstract, methodology, authors, keywords, and
                more in the next step.
            </div>
        </WizardCard>
    );
}

async function runResearchMetadataExtraction(state: AgencyUploadState) {
    if (!state.researchId) {
        return {
            metadata: metadataFieldsTemplate.map((field) =>
                field.key === 'title' && state.manualTitle.trim()
                    ? { ...field, value: state.manualTitle.trim() }
                    : { ...field },
            ),
            aiSuggestedSDGs: [],
        };
    }

    const results = await getAgencyAiResults(state.researchId);
    const metadata = results.ai_metadata;
    const sdgClassification = results.sdg_classification;

    return {
        metadata: metadataFieldsTemplate.map((field) => {
            const valueMap: Record<string, string> = {
                title:
                    metadata.extracted_title ??
                    state.manualTitle.trim() ??
                    '',
                abstract: metadata.extracted_abstract ?? '',
                keywords: metadata.extracted_keywords?.join(', ') ?? '',
                authors: metadata.extracted_authors?.join(', ') ?? '',
            };

            return {
                ...field,
                value: valueMap[field.key] ?? '',
            };
        }),
        aiSuggestedSDGs:
            sdgClassification.suggested_sdg_tags
                ?.map((item) =>
                    Number(
                        String(typeof item === 'string' ? item : item.sdg)
                            .match(/\d+/u)?.[0],
                    ),
                )
                .filter((sdg) => Number.isFinite(sdg) && sdg > 0) ?? [],
    };
}

function MetadataStep({
    state,
    setState,
}: {
    state: AgencyUploadState;
    setState: React.Dispatch<React.SetStateAction<AgencyUploadState>>;
}) {
    const [isExtracting, setIsExtracting] = useState(false);

    const runAi = async () => {
        setIsExtracting(true);

        try {
            const result = await runResearchMetadataExtraction(state);

            setState((current) => ({
                ...current,
                aiHasRun: true,
                metadata: result.metadata,
                aiSuggestedSdgs: result.aiSuggestedSDGs,
            }));
        } finally {
            setIsExtracting(false);
        }
    };

    const updateField = (field: MetadataField) => {
        setState((current) => ({
            ...current,
            metadata: current.metadata.map((item) =>
                item.key === field.key ? field : item,
            ),
        }));
    };

    return (
        <WizardCard
            icon={<Brain className="size-5" />}
            title="Auto-Detected Metadata"
            subtitle="AI automatically extracts structured metadata from your uploaded document. All fields are editable."
            step={3}
            tone="violet"
        >
            {!state.aiHasRun ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="relative flex size-24 items-center justify-center rounded-[16px] bg-[#f3e8ff] text-[#7c3aed]">
                        <Brain className="size-12" />
                        <span className="absolute -top-1 -right-1 flex size-8 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-sm">
                            <Sparkles className="size-4" />
                        </span>
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-[#1e2939]">
                        Ready to Analyze Document
                    </h3>
                    <p className="mt-1 max-w-sm text-sm leading-5 text-[#6a7282]">
                        Click below to run the AI extraction engine. It will
                        automatically detect and populate all metadata fields.
                    </p>
                    <Button
                        type="button"
                        onClick={() => void runAi()}
                        disabled={isExtracting}
                        className="mt-5 h-11 rounded-[14px] bg-[#7c3aed] px-6 text-white shadow-md hover:bg-[#6d28d9]"
                    >
                        <Sparkles className="size-4" />
                        {isExtracting ? 'Analyzing...' : 'Run AI Analysis'}
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-sm text-[#00a63e]">
                        <div className="flex items-center gap-2">
                            <Check className="size-4" />
                            <div>
                                <p className="font-semibold">
                                    Metadata extracted successfully
                                </p>
                                <p className="text-xs">
                                    All fields are editable. Review and correct
                                    as needed.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-[10px] border-[#bbf7d0] bg-white text-xs text-[#00a63e]"
                            onClick={() => void runAi()}
                            disabled={isExtracting}
                        >
                            {isExtracting ? 'Running...' : 'Re-run'}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#364153]">
                            Extracted Fields
                        </p>
                        <p className="text-[11px] text-[#99a1af]">
                            Auto-detected (editable) - Click to expand
                        </p>
                    </div>

                    {state.metadata.map((field) => (
                        <details
                            key={field.key}
                            open={['title', 'abstract', 'methodology'].includes(
                                field.key,
                            )}
                            className="rounded-[10px] border border-[#e5e7eb] bg-white p-3"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#1e3a8a]">
                                <span className="flex items-center gap-2">
                                    <PenLine className="size-4 text-[#7c3aed]" />
                                    {field.label}
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#00a63e]">
                                        AI Detected
                                    </span>
                                    <ChevronDown className="size-4 text-[#99a1af]" />
                                </span>
                            </summary>
                            <textarea
                                value={field.value}
                                onChange={(event) =>
                                    updateField({
                                        ...field,
                                        value: event.target.value,
                                    })
                                }
                                className="mt-3 min-h-[76px] w-full resize-y rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3 text-sm text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                            />
                        </details>
                    ))}

                    <div className="rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-[#1e3a8a]">
                                    Select Metadata for Public Display
                                </p>
                                <p className="text-xs text-[#6a7282]">
                                    Only selected fields will be visible in the
                                    public repository.
                                </p>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <button
                                    type="button"
                                    className="font-semibold text-[#1e3a8a]"
                                    onClick={() =>
                                        setState((current) => ({
                                            ...current,
                                            metadata: current.metadata.map(
                                                (field) => ({
                                                    ...field,
                                                    isPublic: true,
                                                }),
                                            ),
                                        }))
                                    }
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    className="text-[#6a7282]"
                                    onClick={() =>
                                        setState((current) => ({
                                            ...current,
                                            metadata: current.metadata.map(
                                                (field) => ({
                                                    ...field,
                                                    isPublic: false,
                                                }),
                                            ),
                                        }))
                                    }
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {state.metadata.slice(0, 6).map((field) => (
                                <label
                                    key={field.key}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={field.isPublic}
                                        onChange={(event) =>
                                            updateField({
                                                ...field,
                                                isPublic: event.target.checked,
                                            })
                                        }
                                        className="mt-1 size-4 rounded border-[#d1d5dc] accent-[#1e3a8a]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-semibold text-[#1e3a8a]">
                                            {field.label}
                                        </span>
                                        <span className="line-clamp-1 text-xs text-[#6a7282]">
                                            {field.value}
                                        </span>
                                    </span>
                                    {field.isPublic && (
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#1e3a8a]">
                                            Public
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </WizardCard>
    );
}

function SdgStep({
    state,
    setState,
}: {
    state: AgencyUploadState;
    setState: React.Dispatch<React.SetStateAction<AgencyUploadState>>;
}) {
    const suggestedSdgs = state.aiSuggestedSdgs.length
        ? state.aiSuggestedSdgs
        : [9, 8, 17];

    const toggleSdg = (id: number) => {
        setState((current) => ({
            ...current,
            selectedSdgs: current.selectedSdgs.includes(id)
                ? current.selectedSdgs.filter((item) => item !== id)
                : [...current.selectedSdgs, id],
        }));
    };

    return (
        <WizardCard
            icon={<Globe2 className="size-5" />}
            title="SDG Tagging"
            subtitle="Select Sustainable Development Goals - used for repository classification and filtering."
            step={4}
        >
            <div className="mb-5 flex items-center justify-between rounded-[14px] border border-[#fde68a] bg-[#fffbeb] p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-[10px] bg-[#fef3c7] text-[#d97706]">
                        <Sparkles className="size-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-[#101828]">
                            AI SDG Suggestion
                        </p>
                        <p className="text-xs text-[#6a7282]">
                            Based on extracted metadata, we suggest{' '}
                            {suggestedSdgs.map((id) => (
                                <span
                                    key={id}
                                    className="mx-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                                    style={{
                                        backgroundColor:
                                            sdgOptions.find(
                                                (option) => option.id === id,
                                            )?.color ?? '#1e3a8a',
                                    }}
                                >
                                    SDG {id}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    className="rounded-[10px] bg-[#f59e0b] text-white hover:bg-[#d97706]"
                    onClick={() =>
                        setState((current) => ({
                            ...current,
                            selectedSdgs: Array.from(
                                new Set([
                                    ...current.selectedSdgs,
                                    ...suggestedSdgs,
                                ]),
                            ),
                        }))
                    }
                >
                    Apply All
                </Button>
            </div>
            <p className="mb-3 text-sm font-semibold text-[#364153]">
                Select Applicable SDGs
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {sdgOptions.map((sdg) => {
                    const selected = state.selectedSdgs.includes(sdg.id);

                    return (
                        <button
                            key={sdg.id}
                            type="button"
                            onClick={() => toggleSdg(sdg.id)}
                            className={cn(
                                'relative min-h-[78px] rounded-[14px] p-3 text-center text-white shadow-sm transition hover:-translate-y-0.5',
                                selected && 'ring-4 ring-[#1e3a8a]/20',
                            )}
                            style={{ backgroundColor: sdg.color }}
                        >
                            {selected && (
                                <Check className="absolute top-2 right-2 size-4" />
                            )}
                            <p className="text-[9px] font-bold uppercase">
                                SDG
                            </p>
                            <p className="text-2xl leading-none font-bold">
                                {sdg.id}
                            </p>
                            <p className="mt-2 text-[10px] font-semibold">
                                {sdg.name}
                            </p>
                        </button>
                    );
                })}
            </div>
            <div className="mt-5 rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs text-[#4a5565]">
                <Info className="mr-2 inline size-4 text-[#00a63e]" />
                SDG tagging feeds into the RIKMS regional analytics dashboard
                and tracks Region XI's contribution to the UN 2030 Agenda.
            </div>
        </WizardCard>
    );
}

function AccessStep({
    state,
    setState,
}: {
    state: AgencyUploadState;
    setState: React.Dispatch<React.SetStateAction<AgencyUploadState>>;
}) {
    const iconMap: Record<AccessType, React.ReactNode> = {
        public: <Globe2 className="size-5" />,
        request: <Shield className="size-5" />,
        restricted: <Lock className="size-5" />,
        embargo: <Calendar className="size-5" />,
        'external-link': <LinkIcon className="size-5" />,
    };

    return (
        <WizardCard
            icon={<Shield className="size-5" />}
            title="Access Control"
            subtitle="Define who can access or download this research document. This setting can be updated later by the agency administrator."
            step={5}
            tone="rose"
        >
            <div className="space-y-3">
                {accessOptions.map((option) => {
                    const selected = state.accessType === option.id;

                    return (
                        <label
                            key={option.id}
                            className={cn(
                                'block cursor-pointer rounded-[14px] border p-4 transition',
                                selected
                                    ? 'border-[#1e3a8a] bg-[#eff6ff] ring-1 ring-[#1e3a8a]'
                                    : 'border-[#e5e7eb] bg-white hover:border-[#bfdbfe]',
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <input
                                    type="radio"
                                    name="accessType"
                                    value={option.id}
                                    checked={selected}
                                    onChange={() =>
                                        setState((current) => ({
                                            ...current,
                                            accessType: option.id,
                                        }))
                                    }
                                    className="size-4 accent-[#1e3a8a]"
                                />
                                <span
                                    className={cn(
                                        'flex size-10 items-center justify-center rounded-[10px]',
                                        toneClasses[option.tone],
                                    )}
                                >
                                    {iconMap[option.id]}
                                </span>
                                <span>
                                    <span className="block text-sm font-bold text-[#101828]">
                                        {option.label}
                                    </span>
                                    <span className="block text-xs text-[#6a7282]">
                                        {option.description}
                                    </span>
                                </span>
                                {selected && (
                                    <span className="ml-auto rounded-full bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-bold text-white">
                                        Selected
                                    </span>
                                )}
                            </div>
                            {selected && option.id === 'embargo' && (
                                <Input
                                    type="date"
                                    value={state.embargoDate}
                                    onChange={(event) =>
                                        setState((current) => ({
                                            ...current,
                                            embargoDate: event.target.value,
                                        }))
                                    }
                                    className="mt-4 h-10 rounded-[10px] border-[#bfdbfe] bg-white"
                                />
                            )}
                            {selected && option.id === 'external-link' && (
                                <Input
                                    type="url"
                                    value={state.externalUrl}
                                    onChange={(event) =>
                                        setState((current) => ({
                                            ...current,
                                            externalUrl: event.target.value,
                                        }))
                                    }
                                    className="mt-4 h-10 rounded-[10px] border-[#bfdbfe] bg-white"
                                    placeholder="https://repository.example/document"
                                />
                            )}
                        </label>
                    );
                })}
            </div>
            <section className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white">
                <div className="border-b border-[#f3f4f6] p-4">
                    <div className="flex items-center gap-3 text-[#1e3a8a]">
                        <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#eff6ff]">
                            <Shield className="size-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#101828]">
                                Research Owner Contact
                            </p>
                            <p className="text-xs text-[#6a7282]">
                                This contact receives access requests and
                                research inquiries.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="space-y-4 p-4">
                    <label className="block">
                        <span className="text-xs font-semibold text-[#364153]">
                            Research Owner Name
                        </span>
                        <Input
                            value={state.researchOwnerName}
                            onChange={(event) =>
                                setState((current) => ({
                                    ...current,
                                    researchOwnerName: event.target.value,
                                }))
                            }
                            className="mt-2 h-10 rounded-[10px] border-[#e5e7eb] bg-[#f9fafb]"
                            placeholder="Enter research owner name"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[#364153]">
                            Research Owner Email
                        </span>
                        <div className="mt-2 flex gap-2">
                            <Input
                                type="email"
                                value={state.researchOwnerEmail}
                                onChange={(event) =>
                                    setState((current) => ({
                                        ...current,
                                        researchOwnerEmail: event.target.value,
                                    }))
                                }
                                className="h-10 rounded-[10px] border-[#e5e7eb] bg-[#f9fafb]"
                                placeholder="owner@agency.gov.ph"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 shrink-0 rounded-[10px] border-[#bfdbfe] text-xs text-[#1e3a8a]"
                                onClick={() =>
                                    setState((current) => ({
                                        ...current,
                                        researchOwnerEmail:
                                            'agency.admin@dost.gov.ph',
                                    }))
                                }
                            >
                                Use my account email
                            </Button>
                        </div>
                    </label>
                    <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] p-3 text-xs leading-5 text-[#1e3a8a]">
                        Owner email will not be publicly displayed. RIKMS will
                        send the email notification internally.
                    </div>
                </div>
            </section>
            <section className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white p-4">
                <p className="mb-3 text-sm font-bold text-[#101828]">
                    Notification Preferences
                </p>
                <div className="space-y-3 text-sm text-[#364153]">
                    {[
                        [
                            'notifyAccessRequests',
                            'Notify owner when someone requests access',
                        ],
                        [
                            'notifyResearchInquiries',
                            'Notify owner when someone sends a research inquiry',
                        ],
                        ['sendCopyToAdmin', 'Send copy to agency admin'],
                    ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={Boolean(
                                    state[key as keyof AgencyUploadState],
                                )}
                                onChange={(event) =>
                                    setState((current) => ({
                                        ...current,
                                        [key]: event.target.checked,
                                    }))
                                }
                                className="size-4 rounded border-[#d1d5dc] accent-[#1e3a8a]"
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </section>
            <section className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white p-4">
                <p className="mb-1 text-sm font-bold text-[#101828]">
                    Public Repository Contact Preview
                </p>
                <p className="mb-4 text-xs text-[#6a7282]">
                    What public users will see in the research repository:
                </p>
                <div className="rounded-[10px] border border-[#bfdbfe] bg-[#f8faff] p-4">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-bold text-white">
                            ?
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#101828]">
                                {state.researchOwnerName ||
                                    'Research Owner Name'}
                            </p>
                            <p className="text-xs text-[#6a7282]">
                                Davao Region - RIKMS XI
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                            type="button"
                            className="h-9 rounded-[10px] bg-[#1e3a8a] text-xs text-white hover:bg-[#172f70]"
                        >
                            Request Access
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-[10px] border-[#1e3a8a] text-xs text-[#1e3a8a]"
                        >
                            Contact Research Owner
                        </Button>
                    </div>
                    <p className="mt-3 text-[11px] text-[#99a1af]">
                        Email address is hidden from public view.
                    </p>
                </div>
            </section>
            <div className="mt-5 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-xs text-[#6a7282]">
                <Info className="mr-2 inline size-4" />
                Access settings are enforced at the repository level. Agency
                administrators can modify these after submission via the access
                control panel.
            </div>
        </WizardCard>
    );
}

function ReviewStep({
    state,
    onEdit,
}: {
    state: AgencyUploadState;
    onEdit: (step: number) => void;
}) {
    const publicFields = state.metadata.filter((field) => field.isPublic);
    const validationChecks = state.validationResults.length
        ? state.validationResults
        : [
              'Document type confirmed',
              'File uploaded',
              'Public metadata selected',
              'SDG tags selected',
              `Access set to ${getAccessLabel(state.accessType)}`,
          ];

    return (
        <WizardCard
            icon={<FileCheck2 className="size-5" />}
            title="Review Submission"
            subtitle="Verify all information before submitting to the RIKMS repository."
            step={6}
            tone="emerald"
        >
            <div className="mb-4 rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#00a63e]">
                        <Check className="size-5" />
                        <p className="font-semibold">
                            Validation - All checks passed
                        </p>
                    </div>
                    <span className="text-xs text-[#6a7282]">
                        {validationChecks.length}/5 passed
                    </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[#dcfce7]">
                    <div className="h-full rounded-full bg-[#00c950]" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {validationChecks.map((check) => (
                        <span
                            key={check}
                            className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#00a63e]"
                        >
                            {check}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Metric value={state.selectedSdgs.length} label="SDGs Tagged" />
                <Metric value={publicFields.length} label="Public Fields" />
                <Metric
                    value={getAccessLabel(state.accessType)}
                    label="Access"
                />
            </div>

            <ReviewSection
                title="Document Information"
                step="Step 1-2"
                onEdit={() => onEdit(2)}
            >
                <div className="grid gap-4 text-sm md:grid-cols-2">
                    <ReviewItem
                        label="Type"
                        value={getDocumentTypeLabel(state.documentType)}
                    />
                    <ReviewItem
                        label="File"
                        value={state.file?.name ?? 'No file selected'}
                    />
                    <ReviewItem
                        label="Research Title"
                        value={getDisplayTitle(state)}
                        wide
                    />
                </div>
            </ReviewSection>

            <ReviewSection
                title="Extracted Metadata"
                step="Step 3 - AI"
                onEdit={() => onEdit(3)}
            >
                <ReviewItem
                    label="Abstract"
                    value={
                        state.metadata.find((field) => field.key === 'abstract')
                            ?.value ?? 'No abstract extracted'
                    }
                    wide
                />
                <div className="mt-3">
                    <p className="mb-2 text-[11px] font-bold text-[#99a1af] uppercase">
                        Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {(
                            state.metadata.find(
                                (field) => field.key === 'keywords',
                            )?.value ?? ''
                        )
                            .split(',')
                            .slice(0, 8)
                            .map((keyword) => (
                                <span
                                    key={keyword}
                                    className="rounded bg-[#eff6ff] px-2 py-1 text-[10px] font-medium text-[#1e3a8a]"
                                >
                                    {keyword.trim()}
                                </span>
                            ))}
                    </div>
                </div>
                <div className="mt-3">
                    <p className="mb-2 text-[11px] font-bold text-[#99a1af] uppercase">
                        Public Fields ({publicFields.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {publicFields.map((field) => (
                            <span
                                key={field.key}
                                className="rounded-full bg-[#eff6ff] px-2 py-1 text-[10px] font-medium text-[#1e3a8a]"
                            >
                                {field.label}
                            </span>
                        ))}
                    </div>
                </div>
            </ReviewSection>

            <ReviewSection
                title="SDG Alignment"
                step="Step 4"
                onEdit={() => onEdit(4)}
            >
                <div className="flex flex-wrap gap-2">
                    {state.selectedSdgs.map((id) => {
                        const sdg = sdgOptions.find(
                            (option) => option.id === id,
                        );

                        return (
                            <span
                                key={id}
                                className="rounded-[10px] px-3 py-2 text-xs font-bold text-white"
                                style={{
                                    backgroundColor: sdg?.color ?? '#1e3a8a',
                                }}
                            >
                                SDG {id} - {sdg?.name}
                            </span>
                        );
                    })}
                </div>
            </ReviewSection>

            <ReviewSection
                title="Access Control"
                step="Step 5"
                onEdit={() => onEdit(5)}
            >
                <div className="rounded-[10px] bg-[#eff6ff] p-4">
                    <p className="font-semibold text-[#1e3a8a]">
                        {getAccessLabel(state.accessType)}
                    </p>
                    <p className="text-xs text-[#6a7282]">
                        {
                            accessOptions.find(
                                (option) => option.id === state.accessType,
                            )?.description
                        }
                    </p>
                </div>
            </ReviewSection>
        </WizardCard>
    );
}

function Metric({ value, label }: { value: React.ReactNode; label: string }) {
    return (
        <div className="rounded-[10px] bg-[#eff6ff] p-4 text-center">
            <p className="text-xl font-bold text-[#1e3a8a]">{value}</p>
            <p className="text-[11px] text-[#6a7282]">{label}</p>
        </div>
    );
}

function ReviewSection({
    title,
    step,
    onEdit,
    children,
}: {
    title: string;
    step: string;
    onEdit: () => void;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-4 overflow-hidden rounded-[10px] border border-[#e5e7eb]">
            <header className="flex items-center justify-between bg-[#f8faff] px-4 py-3">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#101828]">{title}</h3>
                    <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                        {step}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex items-center gap-1 text-xs font-semibold text-[#1e3a8a]"
                >
                    <PenLine className="size-3.5" />
                    Edit
                </button>
            </header>
            <div className="p-4">{children}</div>
        </section>
    );
}

function ReviewItem({
    label,
    value,
    wide = false,
}: {
    label: string;
    value: string;
    wide?: boolean;
}) {
    return (
        <div className={wide ? 'md:col-span-2' : undefined}>
            <p className="mb-1 text-[11px] font-bold text-[#99a1af] uppercase">
                {label}
            </p>
            <p className="text-sm leading-5 text-[#4a5565]">{value}</p>
        </div>
    );
}

function SuccessState({
    state,
    onReset,
}: {
    state: AgencyUploadState;
    onReset: () => void;
}) {
    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 text-center">
            <section className="w-full max-w-[560px]">
                <div className="relative mx-auto flex size-28 items-center justify-center rounded-full bg-[#dcfce7] text-[#00c950]">
                    <Check className="size-14" />
                    <span className="absolute -top-1 right-0 flex size-8 items-center justify-center rounded-full bg-[#1e3a8a] text-white">
                        <Globe2 className="size-4" />
                    </span>
                </div>
                <h1 className="mt-6 text-[25.6px] leading-[38.4px] font-bold text-[#1e3a8a]">
                    Research Successfully Submitted!
                </h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-[#6a7282]">
                    "{getDisplayTitle(state)}" has been submitted to the RIKMS
                    repository and tagged with {state.selectedSdgs.length} SDG
                    goals.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {state.selectedSdgs.map((id) => {
                        const sdg = sdgOptions.find(
                            (option) => option.id === id,
                        );

                        return (
                            <span
                                key={id}
                                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                                style={{
                                    backgroundColor: sdg?.color ?? '#1e3a8a',
                                }}
                            >
                                SDG {id} - {sdg?.name}
                            </span>
                        );
                    })}
                </div>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Button
                        type="button"
                        className="rounded-[14px] bg-[#1e3a8a] text-white hover:bg-[#172f70]"
                        onClick={() => router.visit('/browse-research')}
                    >
                        <ExternalLink className="size-4" />
                        View in Repository
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-[14px] border-[#e5e7eb]"
                        onClick={onReset}
                    >
                        <Upload className="size-4" />
                        Upload Another Document
                    </Button>
                </div>
            </section>
        </div>
    );
}

function readinessCount(state: AgencyUploadState) {
    return [
        Boolean(state.documentType),
        Boolean(state.file),
        state.aiHasRun && state.metadata.length > 0,
        state.selectedSdgs.length > 0,
        Boolean(state.accessType),
    ].filter(Boolean).length;
}

function canContinue(currentStep: number, state: AgencyUploadState) {
    if (currentStep === 1) {
        return Boolean(state.documentType);
    }

    if (currentStep === 2) {
        return Boolean(state.file) && state.uploadStatus === 'uploaded';
    }

    if (currentStep === 3) {
        return state.aiHasRun && state.metadata.some((field) => field.isPublic);
    }

    if (currentStep === 4) {
        return state.selectedSdgs.length > 0;
    }

    if (currentStep === 5) {
        if (state.accessType === 'embargo') {
            return Boolean(state.embargoDate);
        }

        if (state.accessType === 'external-link') {
            return /^https?:\/\//.test(state.externalUrl.trim());
        }

        return true;
    }

    return true;
}

function validateResearchSubmission(state: AgencyUploadState) {
    const checks = [
        state.documentType === 'research' ? 'Document type confirmed' : '',
        state.file && state.uploadStatus === 'uploaded' ? 'File uploaded' : '',
        state.aiHasRun && state.metadata.some((field) => field.isPublic)
            ? 'Public metadata selected'
            : '',
        state.selectedSdgs.length > 0 ? 'SDG tags selected' : '',
        canUseAccessSettings(state)
            ? `Access set to ${getAccessLabel(state.accessType)}`
            : '',
    ].filter(Boolean);

    return {
        passed: checks.length === 5,
        checks,
    };
}

function canUseAccessSettings(state: AgencyUploadState) {
    if (state.accessType === 'embargo') {
        return Boolean(state.embargoDate);
    }

    if (state.accessType === 'external-link') {
        return Boolean(state.externalUrl.trim());
    }

    return Boolean(state.accessType);
}

export default function UploadResearchWizard() {
    const [state, setState] = useState<AgencyUploadState>(
        createInitialUploadState,
    );
    const [currentStep, setCurrentStep] = useState(2);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [success, setSuccess] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const currentCanContinue = useMemo(
        () => canContinue(currentStep, state),
        [currentStep, state],
    );

    const goNext = async () => {
        if (currentStep === 5) {
            const validation = validateResearchSubmission(state);

            setState((current) => ({
                ...current,
                submissionStatus: validation.passed ? 'ready' : 'draft',
                validationResults: validation.checks,
            }));
        }

        setCurrentStep((step) => Math.min(6, step + 1));
    };

    const goBack = () => {
        if (currentStep === 2) {
            router.visit('/agency/upload');

            return;
        }

        setCurrentStep((step) => Math.max(2, step - 1));
    };

    const saveDraft = async () => {
        setState((current) => ({
            ...current,
            submissionStatus: 'draft',
        }));

        try {
            const result = await saveAgencyResearchDraft(
                state,
                state.researchId,
            );

            setState((current) => ({
                ...current,
                researchId: String(result.id),
            }));
            setDraftSavedAt(
                new Intl.DateTimeFormat(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                }).format(new Date()),
            );
            setSubmitError(null);
        } catch (error) {
            setSubmitError(apiMessage(error, 'Unable to save draft.'));
            setState((current) => ({
                ...current,
                submissionStatus: 'error',
            }));
        }
    };

    const submitResearch = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        setState((current) => ({
            ...current,
            submissionStatus: 'submitting',
        }));

        try {
            const validation = validateResearchSubmission(state);

            if (!validation.passed) {
                throw new Error('Research submission is incomplete.');
            }

            const draft = await saveAgencyResearchDraft(
                state,
                state.researchId,
            );
            const result = await submitAgencyResearch(draft.id);

            setState((current) => ({
                ...current,
                researchId: String(result.id),
                submissionStatus: 'submitted',
                submissionTimestamp:
                    result.updated_at ?? new Date().toISOString(),
            }));
            setConfirmOpen(false);
            setSuccess(true);
        } catch (error) {
            setSubmitError(apiMessage(error, 'Unable to submit research.'));
            setState((current) => ({
                ...current,
                submissionStatus: 'error',
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const reset = () => {
        setState(createInitialUploadState());
        setCurrentStep(2);
        setSuccess(false);
        setDraftSavedAt(null);
        window.history.replaceState(null, '', '/agency/upload/research');
    };

    if (success) {
        return <SuccessState state={state} onReset={reset} />;
    }

    return (
        <main className="px-4 py-8 lg:px-8">
            <div className="mx-auto max-w-[1220px]">
                <WizardHeader currentStep={currentStep} />
                <div className="mt-5 flex items-start gap-5">
                    <div className="min-w-0 flex-1">
                        {submitError ? (
                            <div className="mb-4 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
                                {submitError}
                            </div>
                        ) : null}
                        {currentStep === 2 && (
                            <UploadStep state={state} setState={setState} />
                        )}
                        {currentStep === 3 && (
                            <MetadataStep state={state} setState={setState} />
                        )}
                        {currentStep === 4 && (
                            <SdgStep state={state} setState={setState} />
                        )}
                        {currentStep === 5 && (
                            <AccessStep state={state} setState={setState} />
                        )}
                        {currentStep === 6 && (
                            <ReviewStep
                                state={state}
                                onEdit={(step) => setCurrentStep(step)}
                            />
                        )}

                        {currentStep < 6 ? (
                            <StepNavigation
                                currentStep={currentStep}
                                canContinue={currentCanContinue}
                                onBack={goBack}
                                onNext={() => void goNext()}
                            />
                        ) : (
                            <div className="mt-4 flex items-center justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-[42px] rounded-[14px] border-[#e5e7eb] text-[#4a5565]"
                                    onClick={() => setCurrentStep(5)}
                                >
                                    <ArrowLeft className="size-4" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-[#99a1af]">
                                        6 / 6
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 rounded-[14px] border-[#e5e7eb]"
                                        onClick={() => void saveDraft()}
                                    >
                                        <Save className="size-4" />
                                        {draftSavedAt
                                            ? `Draft saved ${draftSavedAt}`
                                            : 'Save Draft'}
                                    </Button>
                                    <Button
                                        type="button"
                                        className="h-10 rounded-[14px] bg-[#00a63e] px-5 text-white hover:bg-[#008236]"
                                        onClick={() => setConfirmOpen(true)}
                                    >
                                        <Send className="size-4" />
                                        Submit Research
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <PreviewPanel state={state} currentStep={currentStep} />
                </div>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="rounded-[16px] border-0 bg-white p-6 shadow-2xl sm:max-w-[448px]">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-[14px] bg-[#dcfce7] text-[#00a63e]">
                                <Send className="size-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-[17.6px] leading-[26.4px] font-bold text-[#1e3a8a]">
                                    Confirm Submission
                                </DialogTitle>
                                <DialogDescription className="text-xs text-[#99a1af]">
                                    This will submit the document to RIKMS v2
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="rounded-[14px] border border-[#bfdbfe] bg-[#f8faff] p-4">
                        <p className="text-sm leading-[19.25px] font-semibold text-[#1e2939]">
                            {getDisplayTitle(state)}
                        </p>
                        <p className="mt-1">
                            {getDocumentTypeLabel(state.documentType)} -{' '}
                            {state.selectedSdgs.length} SDGs -{' '}
                            {getAccessLabel(state.accessType)}
                        </p>
                    </div>
                    <p className="text-xs leading-4 text-[#6a7282]">
                        By submitting, you certify that all information is
                        accurate and in accordance with RIKMS v2 standards for
                        Region XI.
                    </p>
                    <DialogFooter className="gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-[14px]"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="rounded-[14px] bg-[#00a63e] text-white hover:bg-[#008236]"
                            onClick={() => void submitResearch()}
                            disabled={isSubmitting}
                        >
                            <Check className="size-4" />
                            {isSubmitting
                                ? 'Submitting...'
                                : 'Confirm & Submit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
