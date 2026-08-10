import type { FieldErrors } from 'react-hook-form';
import { createStore } from 'zustand/vanilla';
import type {
    UploadDraftStatus,
    UploadStepId,
    UploadWizardConfig,
    UploadWizardState,
    UploadWizardStepData,
} from '@/types/uploadWizard';

export type UploadWizardStore = UploadWizardState & {
    setActiveStep: (stepId: UploadStepId) => void;
    setStepData: (stepId: UploadStepId, data: UploadWizardStepData) => void;
    markStepComplete: (stepId: UploadStepId) => void;
    setDraftStatus: (status: UploadDraftStatus) => void;
    setDraftSavedAt: (savedAt: string | null) => void;
    setDraftError: (error: string | null) => void;
    setValidationErrors: (stepId: UploadStepId, errors: FieldErrors) => void;
    clearValidationErrors: (stepId: UploadStepId) => void;
    hydrate: (
        stepData: UploadWizardState['stepData'],
        activeStepId: UploadStepId,
        completedStepIds: UploadStepId[],
    ) => void;
};

export type UploadWizardStoreApi = ReturnType<typeof createUploadWizardStore>;

export function createUploadWizardStore(config: UploadWizardConfig) {
    const defaultStartStep = config.defaultStartStepId
        ? config.steps.find((step) => step.id === config.defaultStartStepId)
        : config.steps[0];

    return createStore<UploadWizardStore>((set) => ({
        activeStepId: defaultStartStep?.id ?? config.steps[0].id,
        completedStepIds: config.initialCompletedStepIds ?? [],
        stepData: config.steps.reduce<UploadWizardState['stepData']>(
            (data, step) => ({
                ...data,
                [step.id]: step.defaultValues ?? {},
            }),
            {},
        ),
        draftSavedAt: null,
        draftStatus: 'idle',
        draftError: null,
        validationErrors: {},
        setActiveStep: (stepId) =>
            set((state) => ({
                activeStepId: config.steps.some((step) => step.id === stepId)
                    ? stepId
                    : state.activeStepId,
            })),
        setStepData: (stepId, data) =>
            set((state) => ({
                stepData: {
                    ...state.stepData,
                    [stepId]: data,
                },
            })),
        markStepComplete: (stepId) =>
            set((state) => ({
                completedStepIds: state.completedStepIds.includes(stepId)
                    ? state.completedStepIds
                    : [...state.completedStepIds, stepId],
            })),
        setDraftStatus: (draftStatus) => set({ draftStatus }),
        setDraftSavedAt: (draftSavedAt) => set({ draftSavedAt }),
        setDraftError: (draftError) => set({ draftError }),
        setValidationErrors: (stepId, errors) =>
            set((state) => ({
                validationErrors: {
                    ...state.validationErrors,
                    [stepId]: errors,
                },
            })),
        clearValidationErrors: (stepId) =>
            set((state) => {
                const nextErrors = { ...state.validationErrors };
                delete nextErrors[stepId];

                return { validationErrors: nextErrors };
            }),
        hydrate: (stepData, activeStepId, completedStepIds) =>
            set({
                stepData,
                activeStepId,
                completedStepIds,
                validationErrors: {},
                draftStatus: 'saved',
                draftSavedAt: null,
                draftError: null,
            }),
    }));
}
