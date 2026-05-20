import { useFormContext } from 'react-hook-form';
import UploadStepForm from '@/components/upload/forms/UploadStepForm';
import UploadFieldError from '@/components/upload/shared/UploadFieldError';
import UploadStepShell from '@/components/upload/shared/UploadStepShell';
import UploadValidationSummary from '@/components/upload/shared/UploadValidationSummary';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

type PlaceholderFormValues = {
    notes: string;
};

function PlaceholderNotesField() {
    const {
        register,
        formState: { errors },
    } = useFormContext<PlaceholderFormValues>();

    return (
        <label className="mt-5 block">
            <span className="text-xs font-bold tracking-wide text-[#6a7282] uppercase">
                Draft notes placeholder
            </span>
            <textarea
                {...register('notes')}
                className="mt-2 min-h-28 w-full rounded-[10px] border border-[#d1d5dc] bg-white px-3 py-2 text-sm text-[#101828] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                placeholder="Temporary state field to prove this step preserves data while navigating."
            />
            <UploadFieldError errors={errors} name="notes" />
        </label>
    );
}

export default function PlaceholderStep({
    config,
    step,
    stepIndex,
    totalSteps,
    stepData,
    setStepData,
    errors,
}: UploadWizardStepProps) {
    const placeholderData = stepData as { notes?: unknown };
    const notes =
        typeof placeholderData.notes === 'string' ? placeholderData.notes : '';

    return (
        <UploadStepShell
            title={step.title}
            description={step.description}
            stepLabel={`Step ${stepIndex + 1} of ${totalSteps}`}
        >
            <UploadValidationSummary errors={errors} />

            <div className="rounded-[12px] border border-dashed border-[#bfdbfe] bg-[#f8faff] p-5">
                <p className="text-sm font-semibold text-[#1e3a8a]">
                    Placeholder for {config.eyebrow}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#6a7282]">
                    This step is wired into the shared upload wizard engine. The
                    MCP/Figma implementation can replace this component from the
                    step config without changing navigation or wizard state.
                </p>
            </div>

            <UploadStepForm<PlaceholderFormValues>
                defaultValues={{ notes }}
                onChange={(values) =>
                    setStepData({
                        ...stepData,
                        notes: values.notes,
                    })
                }
            >
                <PlaceholderNotesField />
            </UploadStepForm>
        </UploadStepShell>
    );
}
