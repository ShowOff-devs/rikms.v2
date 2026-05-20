import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UploadNavigationProps = {
    currentStepNumber: number;
    totalSteps: number;
    canGoBack: boolean;
    canGoNext: boolean;
    draftSavedAt: string | null;
    draftStatus: 'idle' | 'saving' | 'saved' | 'error';
    nextLabel?: string;
    onBack: () => void;
    onNext: () => void;
    onSaveDraft: () => void;
};

export default function UploadNavigation({
    currentStepNumber,
    totalSteps,
    canGoBack,
    canGoNext,
    draftSavedAt,
    draftStatus,
    nextLabel = 'Continue',
    onBack,
    onNext,
    onSaveDraft,
}: UploadNavigationProps) {
    const draftLabel =
        draftStatus === 'saving'
            ? 'Saving draft...'
            : draftStatus === 'error'
              ? 'Draft save failed'
              : draftSavedAt
                ? `Draft saved ${draftSavedAt}`
                : '';

    return (
        <div className="mt-4 flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[10px] border-[#d1d5dc] text-[#4a5565]"
                disabled={!canGoBack}
                onClick={onBack}
            >
                <ArrowLeft className="size-4" />
                Previous
            </Button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-xs font-medium text-[#6a7282]">
                    {currentStepNumber} / {totalSteps}
                    {draftLabel ? ` - ${draftLabel}` : ''}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-[10px] border-[#d1d5dc]"
                    disabled={draftStatus === 'saving'}
                    onClick={onSaveDraft}
                >
                    <Save className="size-4" />
                    Save Draft
                </Button>
                <Button
                    type="button"
                    className="h-10 rounded-[10px] bg-[#1e3a8a] px-5 text-white hover:bg-[#172f70]"
                    disabled={!canGoNext}
                    onClick={onNext}
                >
                    {nextLabel}
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
