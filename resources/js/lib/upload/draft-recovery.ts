import type { UploadWizardState } from '@/types/uploadWizard';

export function terminalReportRecoveryKey(scope: string) {
    return `rikms.terminal-report.recovery.${scope}`;
}

export function serializeTerminalReportRecovery(
    state: Pick<UploadWizardState, 'stepData' | 'activeStepId'>,
) {
    return JSON.stringify(state, (_key, value) =>
        typeof File !== 'undefined' && value instanceof File
            ? undefined
            : value,
    );
}

export function parseTerminalReportRecovery(value: string) {
    return JSON.parse(value) as Pick<
        UploadWizardState,
        'stepData' | 'activeStepId'
    >;
}
