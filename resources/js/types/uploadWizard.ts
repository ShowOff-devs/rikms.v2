import type { ComponentType } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';

export type UploadFlowType =
    | 'research'
    | 'terminal-report'
    | 'project-accomplishment';

export type UploadStepId =
    | 'doc-type'
    | 'upload'
    | 'details'
    | 'ai-metadata'
    | 'performance'
    | 'pap-classification'
    | 'financials'
    | 'highlights'
    | 'sdg-tagging'
    | 'access'
    | 'review';

export type UploadWizardStepData = object;

export type UploadWizardState = {
    activeStepId: UploadStepId;
    completedStepIds: UploadStepId[];
    stepData: Partial<Record<UploadStepId, UploadWizardStepData>>;
    draftSavedAt: string | null;
    draftStatus: UploadDraftStatus;
    validationErrors: Partial<Record<UploadStepId, FieldErrors>>;
};

export type UploadDraftStatus = 'idle' | 'saving' | 'saved' | 'error';

export type UploadWizardStepProps = {
    config: UploadWizardConfig;
    step: UploadWizardStep;
    stepIndex: number;
    totalSteps: number;
    state: UploadWizardState;
    stepData: UploadWizardStepData;
    setStepData: (data: UploadWizardStepData) => void;
    goBack: () => void;
    goNext: () => void;
    goToStep: (stepId: UploadStepId) => void;
    saveDraft: () => Promise<void>;
    errors: FieldErrors;
};

export type UploadWizardStep = {
    id: UploadStepId;
    title: string;
    description: string;
    defaultValues?: UploadWizardStepData;
    schema?: z.ZodTypeAny;
    component?: ComponentType<UploadWizardStepProps>;
    hideNavigation?: boolean;
    nextLabel?: string;
};

export type UploadWizardConfig = {
    type: UploadFlowType;
    title: string;
    description: string;
    eyebrow: string;
    steps: UploadWizardStep[];
    defaultStartStepId?: UploadStepId;
    initialCompletedStepIds?: UploadStepId[];
    lockedStepIds?: UploadStepId[];
    startStepBackHref?: string;
};

export type UploadDraftPayload = {
    flowType: UploadFlowType;
    state: UploadWizardState;
};

export type UploadDraftResult = {
    id: string;
    savedAt: string;
};
