import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadStepId, UploadWizardStep } from '@/types/uploadWizard';

type UploadStepperProps = {
    steps: UploadWizardStep[];
    activeStepId: UploadStepId;
    completedStepIds?: UploadStepId[];
    lockedStepIds?: UploadStepId[];
    onStepSelect: (stepId: UploadStepId) => void;
};

export default function UploadStepper({
    steps,
    activeStepId,
    completedStepIds = [],
    lockedStepIds = [],
    onStepSelect,
}: UploadStepperProps) {
    return (
        <nav
            aria-label="Upload progress"
            className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-sm"
        >
            <div className="flex items-start overflow-x-auto pb-1">
                {steps.map((step, index) => {
                    const isComplete = completedStepIds.includes(step.id);
                    const isActive = step.id === activeStepId;
                    const isLocked = lockedStepIds.includes(step.id);
                    const canSelect = !isLocked && (isActive || isComplete);

                    return (
                        <div
                            key={step.id}
                            className="flex min-w-[112px] flex-1 items-center last:flex-none"
                        >
                            <button
                                type="button"
                                onClick={() => onStepSelect(step.id)}
                                disabled={!canSelect}
                                className="group flex min-w-[72px] flex-col items-center gap-1.5 text-center"
                                aria-current={isActive ? 'step' : undefined}
                            >
                                <span
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                                        isComplete &&
                                            'border-[#00a63e] bg-[#00a63e] text-white',
                                        isActive &&
                                            'border-[#1e3a8a] bg-[#1e3a8a] text-white',
                                        !isComplete &&
                                            !isActive &&
                                            'border-[#d1d5dc] bg-white text-[#99a1af]',
                                    )}
                                >
                                    {isComplete ? (
                                        <Check className="size-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'max-w-24 text-[11px] leading-4 font-semibold',
                                        isActive || isComplete
                                            ? 'text-[#1e3a8a]'
                                            : 'text-[#99a1af]',
                                    )}
                                >
                                    {step.title}
                                </span>
                            </button>

                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-2 h-0.5 min-w-8 flex-1',
                                        isComplete
                                            ? 'bg-[#00a63e]'
                                            : 'bg-[#e5e7eb]',
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
