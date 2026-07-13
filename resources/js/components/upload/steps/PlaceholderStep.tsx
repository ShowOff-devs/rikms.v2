import UploadStepShell from '@/components/upload/shared/UploadStepShell';
import UploadValidationSummary from '@/components/upload/shared/UploadValidationSummary';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

export default function PlaceholderStep({
    config,
    step,
    stepIndex,
    totalSteps,
    errors,
}: UploadWizardStepProps) {
    return (
        <UploadStepShell
            title={step.title}
            description={step.description}
            stepLabel={`Step ${stepIndex + 1} of ${totalSteps}`}
        >
            <UploadValidationSummary errors={errors} />

            <div className="rounded-[12px] border border-[#d1d5dc] bg-[#f8fafc] p-5">
                <p className="text-sm font-semibold text-[#1e3a8a]">
                    This step is not available during the pilot
                </p>
                <p className="mt-1 text-sm leading-6 text-[#6a7282]">
                    The current {config.eyebrow.toLowerCase()} workflow does not
                    collect information for this step. Continue with the
                    available steps or return to the previous step.
                </p>
            </div>
        </UploadStepShell>
    );
}
