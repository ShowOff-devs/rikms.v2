import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import PlaceholderStep from '@/components/upload/steps/PlaceholderStep';
import UploadNavigation from '@/components/upload/wizard/UploadNavigation';
import UploadWizardLayout from '@/components/upload/wizard/UploadWizardLayout';
import { getAgencyResearch } from '@/lib/agency/agency-research-service';
import { apiMessage } from '@/lib/api-client';
import {
    parseTerminalReportRecovery,
    serializeTerminalReportRecovery,
    terminalReportRecoveryKey,
} from '@/lib/upload/draft-recovery';
import {
    REPORT_STEP_IDS,
    buildReportWorkflowData,
} from '@/lib/upload/report-workflow';
import {
    hydrateReportWorkflowFromRecord,
    saveReportDraft,
} from '@/lib/upload/services/report-upload-service';
import { createUploadWizardStore } from '@/stores/uploadWizardStore';
import type { UploadWizardStoreApi } from '@/stores/uploadWizardStore';
import type {
    ReportDetailsData,
    ReportDocumentType,
} from '@/types/upload/reportWorkflow';
import type {
    UploadStepId,
    UploadWizardConfig,
    UploadWizardState,
    UploadWizardStepData,
} from '@/types/uploadWizard';

type UploadWizardProps = {
    config: UploadWizardConfig;
    initialResearchId?: string;
    agencyName?: string;
    recoveryScope?: string;
};

function workflowStepData(
    data: ReturnType<typeof buildReportWorkflowData>,
): UploadWizardState['stepData'] {
    return {
        [REPORT_STEP_IDS.docType]: {
            documentType: data.documentType,
            selectedWorkflow: data.selectedWorkflow,
        },
        [REPORT_STEP_IDS.details]: data.details,
        [REPORT_STEP_IDS.aiMetadata]: data.aiMetadata,
        [REPORT_STEP_IDS.performance]: data.performance,
        [REPORT_STEP_IDS.papClassification]: data.papClassification,
        [REPORT_STEP_IDS.financials]: data.financials,
        [REPORT_STEP_IDS.highlights]: data.highlights,
        [REPORT_STEP_IDS.sdgTagging]: data.sdgTagging,
        [REPORT_STEP_IDS.review]: data.review,
    };
}

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

export default function UploadWizard({
    config,
    initialResearchId,
    agencyName = '',
    recoveryScope,
}: UploadWizardProps) {
    const [store] = useState<UploadWizardStoreApi>(() =>
        createUploadWizardStore(config),
    );
    const editRevision = useRef(0);
    const saveRequest = useRef(0);
    const state = useStore(
        store,
        useShallow((wizardState) => ({
            activeStepId: wizardState.activeStepId,
            completedStepIds: wizardState.completedStepIds,
            stepData: wizardState.stepData,
            draftSavedAt: wizardState.draftSavedAt,
            draftStatus: wizardState.draftStatus,
            draftError: wizardState.draftError,
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
    const setDraftError = useStore(
        store,
        (wizardState) => wizardState.setDraftError,
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
        editRevision.current += 1;
        setStepDataInStore(activeStep.id, data);
        setDraftError(null);
        setDraftStatus('unsaved');
    };

    const setWorkflowStepData = (
        stepId: UploadStepId,
        data: UploadWizardStepData,
    ) => {
        editRevision.current += 1;
        setStepDataInStore(stepId, data);
        setDraftError(null);
        setDraftStatus('unsaved');
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
        window.setTimeout(() => {
            document
                .querySelector<HTMLElement>('[data-validation-summary]')
                ?.focus();
        });

        return false;
    };

    const selectStep = (stepId: UploadStepId) => {
        if (
            !config.lockedStepIds?.includes(stepId) &&
            (stepId === state.activeStepId ||
                state.completedStepIds.includes(stepId) ||
                Object.keys(state.validationErrors[stepId] ?? {}).length > 0)
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

    useEffect(() => {
        const currentDetails = store.getState().stepData[
            REPORT_STEP_IDS.details
        ] as ReportDetailsData;

        if (!initialResearchId && agencyName && !currentDetails.agency) {
            setStepDataInStore(REPORT_STEP_IDS.details, {
                ...currentDetails,
                agency: agencyName,
            });
        }

        if (!initialResearchId && recoveryScope) {
            const key = terminalReportRecoveryKey(recoveryScope);
            const recovered = window.localStorage.getItem(key);

            if (recovered) {
                // Consume before prompting so React Strict Mode cannot prompt twice.
                // Accepted recovery is written back by the unsaved-draft effect.
                window.localStorage.removeItem(key);

                if (
                    window.confirm(
                        'Restore the unsaved terminal-report draft from this browser?',
                    )
                ) {
                    try {
                        const recoveredState =
                            parseTerminalReportRecovery(recovered);
                        const stepData = {
                            ...store.getState().stepData,
                            ...(recoveredState.stepData ?? {}),
                        };
                        const details = stepData[
                            REPORT_STEP_IDS.details
                        ] as ReportDetailsData;
                        stepData[REPORT_STEP_IDS.details] = {
                            ...details,
                            uploadedFile: null,
                            agency: agencyName || details.agency,
                        };
                        const active = config.steps.some(
                            (step) => step.id === recoveredState.activeStepId,
                        )
                            ? (recoveredState.activeStepId as UploadStepId)
                            : (config.defaultStartStepId ?? config.steps[0].id);
                        store
                            .getState()
                            .hydrate(stepData, active, [
                                REPORT_STEP_IDS.docType,
                            ]);
                        setDraftError(null);
                        setDraftStatus('unsaved');
                    } catch {
                        window.localStorage.removeItem(key);
                    }
                }
            }
        }
    }, [
        agencyName,
        config,
        initialResearchId,
        recoveryScope,
        setDraftError,
        setDraftStatus,
        setStepDataInStore,
        store,
    ]);

    useEffect(() => {
        if (!initialResearchId) {
            return;
        }

        let cancelled = false;
        setDraftStatus('loading');

        void getAgencyResearch(initialResearchId)
            .then((record) => {
                if (cancelled) {
                    return;
                }

                const workflow = hydrateReportWorkflowFromRecord(
                    record,
                    agencyName,
                );
                const requestedStep = workflow.details.lastWizardStep;
                const activeStep = config.steps.some(
                    (step) => step.id === requestedStep,
                )
                    ? (requestedStep as UploadStepId)
                    : (config.defaultStartStepId ?? config.steps[0].id);
                const activeIndex = config.steps.findIndex(
                    (step) => step.id === activeStep,
                );
                const stepData = workflowStepData(workflow);
                const completed = config.steps
                    .filter(
                        (step, index) =>
                            index < activeIndex ||
                            step.schema?.safeParse(stepData[step.id]).success,
                    )
                    .map((step) => step.id);

                store.getState().hydrate(stepData, activeStep, completed);
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setDraftError(
                        apiMessage(error, 'Unable to load the report draft.'),
                    );
                    setDraftStatus('error');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        agencyName,
        config,
        initialResearchId,
        setDraftError,
        setDraftStatus,
        store,
    ]);

    useEffect(() => {
        if (!recoveryScope || state.draftStatus !== 'unsaved') {
            return;
        }

        const details = state.stepData[
            REPORT_STEP_IDS.details
        ] as ReportDetailsData;
        const key = terminalReportRecoveryKey(recoveryScope);

        if (details?.researchId) {
            window.localStorage.removeItem(key);

            return;
        }

        const serialized = serializeTerminalReportRecovery({
            stepData: state.stepData,
            activeStepId: state.activeStepId,
        });
        window.localStorage.setItem(key, serialized);
    }, [recoveryScope, state.activeStepId, state.draftStatus, state.stepData]);

    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (store.getState().draftStatus !== 'unsaved') {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', beforeUnload);

        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, [store]);

    useEffect(
        () =>
            router.on('before', (event) => {
                if (
                    store.getState().draftStatus === 'unsaved' &&
                    !window.confirm(
                        'You have unsaved terminal-report changes. Leave this page?',
                    )
                ) {
                    event.preventDefault();
                }
            }),
        [store],
    );

    const markSubmissionComplete = () => {
        setDraftError(null);
        setDraftStatus('saved');

        if (recoveryScope) {
            window.localStorage.removeItem(
                terminalReportRecoveryKey(recoveryScope),
            );
        }
    };

    const goNext = () => {
        const nextStep = config.steps[activeStepIndex + 1];

        if (nextStep && validateStep()) {
            markStepComplete(activeStep.id);
            setActiveStep(nextStep.id);
        }
    };

    const applyBackendErrors = (
        backendErrors: Record<string, string[] | string>,
    ) => {
        const grouped = new Map<UploadStepId, FieldErrors>();

        for (const [key, value] of Object.entries(backendErrors)) {
            const match = key.match(/^sections\.([^.]+)\.(.+)$/u);
            const stepId = match?.[1] as UploadStepId | undefined;

            if (!stepId || !config.steps.some((step) => step.id === stepId)) {
                continue;
            }

            const field = match?.[2]?.split('.')[0] ?? 'root';
            const message = Array.isArray(value) ? value.join(' ') : value;
            grouped.set(stepId, {
                ...(grouped.get(stepId) ?? {}),
                [field]: { type: 'server', message },
            });
        }

        for (const [stepId, errors] of grouped) {
            setValidationErrors(stepId, errors);
        }

        const firstInvalidStep = config.steps.find((step) =>
            grouped.has(step.id),
        );

        if (firstInvalidStep) {
            setActiveStep(firstInvalidStep.id);
        }
    };

    const saveDraft = async () => {
        const requestId = ++saveRequest.current;
        const revisionAtSave = editRevision.current;
        setDraftError(null);
        setDraftStatus('saving');

        try {
            if (
                config.type === 'terminal-report' ||
                config.type === 'project-accomplishment'
            ) {
                const workflowData = buildReportWorkflowData(
                    config.type as ReportDocumentType,
                    store.getState().stepData,
                );
                workflowData.details = {
                    ...workflowData.details,
                    agency: agencyName || workflowData.details.agency,
                    lastWizardStep: state.activeStepId,
                };
                const result = await saveReportDraft(workflowData);

                if (requestId !== saveRequest.current) {
                    return false;
                }

                if (revisionAtSave === editRevision.current) {
                    const hydrated = hydrateReportWorkflowFromRecord(
                        result,
                        agencyName,
                    );
                    hydrated.details.lastWizardStep = state.activeStepId;
                    const currentState = store.getState();
                    currentState.hydrate(
                        workflowStepData(hydrated),
                        currentState.activeStepId,
                        currentState.completedStepIds,
                    );
                } else {
                    const currentDetails = store.getState().stepData[
                        REPORT_STEP_IDS.details
                    ] as ReportDetailsData;
                    setStepDataInStore(REPORT_STEP_IDS.details, {
                        ...currentDetails,
                        researchId: String(result.id),
                        serverUpdatedAt: result.updated_at ?? null,
                        serverDraftVersion:
                            result.report_detail?.draft_version ?? null,
                    } satisfies ReportDetailsData);
                }

                window.history.replaceState(
                    window.history.state,
                    '',
                    `/agency/upload/terminal-report/${result.id}`,
                );

                if (recoveryScope) {
                    window.localStorage.removeItem(
                        terminalReportRecoveryKey(recoveryScope),
                    );
                }

                if (revisionAtSave === editRevision.current) {
                    setDraftSavedAt(
                        new Intl.DateTimeFormat(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                        }).format(new Date()),
                    );
                    setDraftStatus('saved');
                } else {
                    setDraftStatus('unsaved');
                }

                return true;
            }

            throw new Error(
                'Draft saving is not available for this upload workflow during the pilot.',
            );
        } catch (error) {
            if (requestId === saveRequest.current) {
                setDraftError(
                    apiMessage(error, 'Unable to save the report draft.'),
                );
                setDraftStatus('error');
            }

            throw error;
        }
    };

    if (state.draftStatus === 'loading') {
        return (
            <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-10 text-center text-sm text-[#6a7282] shadow-sm">
                Loading the saved terminal-report draft…
            </div>
        );
    }

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
                setWorkflowStepData={setWorkflowStepData}
                goBack={goBack}
                goNext={goNext}
                goToStep={selectStep}
                saveDraft={saveDraft}
                applyBackendErrors={applyBackendErrors}
                markSubmissionComplete={markSubmissionComplete}
                errors={state.validationErrors[activeStep.id] ?? {}}
            />

            {!activeStep.hideNavigation ? (
                <UploadNavigation
                    currentStepNumber={activeStepIndex + 1}
                    totalSteps={config.steps.length}
                    canGoBack={activeStepIndex > 0}
                    canGoNext={activeStepIndex < config.steps.length - 1}
                    draftSavedAt={state.draftSavedAt}
                    draftStatus={state.draftStatus}
                    draftError={state.draftError}
                    nextLabel={activeStep.nextLabel}
                    onBack={goBack}
                    onNext={goNext}
                    onSaveDraft={() => {
                        void saveDraft().catch(() => undefined);
                    }}
                />
            ) : null}
        </UploadWizardLayout>
    );
}
