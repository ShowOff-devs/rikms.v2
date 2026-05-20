import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import PlaceholderStep from '@/components/upload/steps/PlaceholderStep';
import UploadNavigation from '@/components/upload/wizard/UploadNavigation';
import UploadWizardLayout from '@/components/upload/wizard/UploadWizardLayout';
import { saveUploadDraft } from '@/lib/upload/services/mock-upload-draft-service';
import { createUploadWizardStore } from '@/stores/uploadWizardStore';
import type { UploadWizardStoreApi } from '@/stores/uploadWizardStore';
import type {
    UploadStepId,
    UploadWizardConfig,
    UploadWizardStepData,
} from '@/types/uploadWizard';

type UploadWizardProps = {
    config: UploadWizardConfig;
};

function buildFieldErrors(error: z.ZodError) {
    return error.issues.reduce<FieldErrors>((errors, issue) => {
        const field = issue.path[0]?.toString() ?? 'root';

        return {
            ...errors,
            [field]: {
                type: 'custom',
                message: issue.message,
            },
        };
    }, {});
}

export default function UploadWizard({ config }: UploadWizardProps) {
    const [store] = useState<UploadWizardStoreApi>(() =>
        createUploadWizardStore(config),
    );
    const state = useStore(
        store,
        useShallow((wizardState) => ({
            activeStepId: wizardState.activeStepId,
            completedStepIds: wizardState.completedStepIds,
            stepData: wizardState.stepData,
            draftSavedAt: wizardState.draftSavedAt,
            draftStatus: wizardState.draftStatus,
            validationErrors: wizardState.validationErrors,
        })),
    );
    const setActiveStep = useStore(
        store,
        (wizardState) => wizardState.setActiveStep,
    );
    const setStepDataInStore = useStore(
        store,
        (wizardState) => wizardState.setStepData,
    );
    const markStepComplete = useStore(
        store,
        (wizardState) => wizardState.markStepComplete,
    );
    const setDraftStatus = useStore(
        store,
        (wizardState) => wizardState.setDraftStatus,
    );
    const setDraftSavedAt = useStore(
        store,
        (wizardState) => wizardState.setDraftSavedAt,
    );
    const setValidationErrors = useStore(
        store,
        (wizardState) => wizardState.setValidationErrors,
    );
    const clearValidationErrors = useStore(
        store,
        (wizardState) => wizardState.clearValidationErrors,
    );

    const activeStepIndex = Math.max(
        config.steps.findIndex((step) => step.id === state.activeStepId),
        0,
    );
    const activeStep = config.steps[activeStepIndex];
    const StepComponent = activeStep.component ?? PlaceholderStep;
    const activeStepData = state.stepData[activeStep.id] ?? {};

    const setActiveStepData = (data: UploadWizardStepData) => {
        setStepDataInStore(activeStep.id, data);
    };

    const validateStep = () => {
        if (!activeStep.schema) {
            clearValidationErrors(activeStep.id);

            return true;
        }

        const result = activeStep.schema.safeParse(activeStepData);

        if (result.success) {
            clearValidationErrors(activeStep.id);

            return true;
        }

        setValidationErrors(activeStep.id, buildFieldErrors(result.error));

        return false;
    };

    const canProceedFromActiveStep = () => {
        if (!activeStep.schema) {
            return true;
        }

        return activeStep.schema.safeParse(activeStepData).success;
    };

    const selectStep = (stepId: UploadStepId) => {
        if (
            !config.lockedStepIds?.includes(stepId) &&
            (stepId === state.activeStepId ||
                state.completedStepIds.includes(stepId))
        ) {
            setActiveStep(stepId);
        }
    };

    const goBack = () => {
        if (
            activeStep.id === config.defaultStartStepId &&
            config.startStepBackHref
        ) {
            router.visit(config.startStepBackHref);

            return;
        }

        const previousStep = config.steps[activeStepIndex - 1];

        if (previousStep) {
            setActiveStep(previousStep.id);
        }
    };

    const goNext = () => {
        const nextStep = config.steps[activeStepIndex + 1];

        if (nextStep && validateStep()) {
            markStepComplete(activeStep.id);
            setActiveStep(nextStep.id);
        }
    };

    const saveDraft = async () => {
        setDraftStatus('saving');

        try {
            const result = await saveUploadDraft({
                flowType: config.type,
                state: store.getState(),
            });

            setDraftSavedAt(
                new Intl.DateTimeFormat(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                }).format(new Date(result.savedAt)),
            );
            setDraftStatus('saved');
        } catch {
            setDraftStatus('error');
        }
    };

    return (
        <UploadWizardLayout
            config={config}
            state={state}
            onStepSelect={selectStep}
        >
            <StepComponent
                config={config}
                step={activeStep}
                stepIndex={activeStepIndex}
                totalSteps={config.steps.length}
                state={state}
                stepData={activeStepData}
                setStepData={setActiveStepData}
                goBack={goBack}
                goNext={goNext}
                goToStep={selectStep}
                saveDraft={saveDraft}
                errors={state.validationErrors[activeStep.id] ?? {}}
            />

            {!activeStep.hideNavigation ? (
                <UploadNavigation
                    currentStepNumber={activeStepIndex + 1}
                    totalSteps={config.steps.length}
                    canGoBack={activeStepIndex > 0}
                    canGoNext={
                        activeStepIndex < config.steps.length - 1 &&
                        canProceedFromActiveStep()
                    }
                    draftSavedAt={state.draftSavedAt}
                    draftStatus={state.draftStatus}
                    nextLabel={activeStep.nextLabel}
                    onBack={goBack}
                    onNext={goNext}
                    onSaveDraft={saveDraft}
                />
            ) : null}
        </UploadWizardLayout>
    );
}
