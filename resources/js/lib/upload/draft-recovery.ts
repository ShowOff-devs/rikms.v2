import type { ReportDocumentType } from '@/types/upload/reportWorkflow';
import type {
    UploadDraftStatus,
    UploadStepId,
    UploadWizardState,
    UploadWizardStepData,
} from '@/types/uploadWizard';

const RECOVERY_VERSION = 2;
const NEW_DRAFT_ID = 'new';
const OMITTED_RECOVERY_KEYS = new Set([
    'agency',
    'analysisMessage',
    'extractedMetadata',
    'highlightId',
    'researchId',
    'serverDraftVersion',
    'serverUpdatedAt',
    'supportingFiles',
    'uploadedFile',
    'uploadedFileId',
    'uploadedFileName',
    'uploadedFileSize',
    'uploadedFileType',
]);

export type ReportRecoveryScope = {
    agencyId: string;
    userId: string;
    documentType: ReportDocumentType;
    draftId?: string | null;
};

export type ReportRecoverySnapshot = {
    version: typeof RECOVERY_VERSION;
    scope: Required<ReportRecoveryScope>;
    savedAt: string;
    baseServerDraftVersion: number | null;
    baseServerUpdatedAt: string | null;
    activeStepId: UploadStepId;
    stepData: UploadWizardState['stepData'];
};

type ServerRecoveryVersion = {
    draftVersion: number | null;
    updatedAt: string | null;
};

function normalizedScope(
    scope: ReportRecoveryScope,
): Required<ReportRecoveryScope> {
    const draftId = scope.draftId?.trim();

    return {
        agencyId: scope.agencyId.trim(),
        userId: scope.userId.trim(),
        documentType: scope.documentType,
        draftId:
            draftId && /^[1-9]\d*$/u.test(draftId) ? draftId : NEW_DRAFT_ID,
    };
}

function sameScope(
    first: Required<ReportRecoveryScope>,
    second: Required<ReportRecoveryScope>,
) {
    return (
        first.agencyId === second.agencyId &&
        first.userId === second.userId &&
        first.documentType === second.documentType &&
        first.draftId === second.draftId
    );
}

function sanitizeStepData(stepData: UploadWizardState['stepData']) {
    const serialized = JSON.stringify(stepData, (key, value) => {
        if (OMITTED_RECOVERY_KEYS.has(key)) {
            return undefined;
        }

        if (
            (typeof File !== 'undefined' && value instanceof File) ||
            (typeof Blob !== 'undefined' && value instanceof Blob)
        ) {
            return undefined;
        }

        return value;
    });

    return JSON.parse(serialized) as UploadWizardState['stepData'];
}

function isRecoverySnapshot(value: unknown): value is ReportRecoverySnapshot {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<ReportRecoverySnapshot>;

    return (
        candidate.version === RECOVERY_VERSION &&
        typeof candidate.savedAt === 'string' &&
        typeof candidate.scope?.agencyId === 'string' &&
        typeof candidate.scope.userId === 'string' &&
        (candidate.scope.documentType === 'terminal-report' ||
            candidate.scope.documentType === 'project-accomplishment') &&
        typeof candidate.scope.draftId === 'string' &&
        typeof candidate.activeStepId === 'string' &&
        Boolean(candidate.stepData) &&
        typeof candidate.stepData === 'object'
    );
}

export function browserRecoveryUserId(email: string) {
    let hash = 2166136261;

    for (const character of email.trim().toLocaleLowerCase()) {
        hash ^= character.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 16777619);
    }

    return `legacy-${(hash >>> 0).toString(36)}`;
}

export function reportRecoveryKey(scope: ReportRecoveryScope) {
    const normalized = normalizedScope(scope);

    return [
        'rikms.report-recovery.v2',
        normalized.documentType,
        encodeURIComponent(normalized.agencyId),
        encodeURIComponent(normalized.userId),
        normalized.draftId,
    ].join('.');
}

export function reportDocumentLabel(documentType: ReportDocumentType) {
    return documentType === 'project-accomplishment'
        ? 'Project Accomplishment Report'
        : 'Terminal Report';
}

export function serializeReportRecovery(
    scope: ReportRecoveryScope,
    state: Pick<UploadWizardState, 'stepData' | 'activeStepId'>,
    server: ServerRecoveryVersion,
) {
    const snapshot: ReportRecoverySnapshot = {
        version: RECOVERY_VERSION,
        scope: normalizedScope(scope),
        savedAt: new Date().toISOString(),
        baseServerDraftVersion: server.draftVersion,
        baseServerUpdatedAt: server.updatedAt,
        activeStepId: state.activeStepId,
        stepData: sanitizeStepData(state.stepData),
    };

    return JSON.stringify(snapshot);
}

export function migrateLegacyTerminalReportRecovery(
    value: string,
    scope: ReportRecoveryScope,
) {
    if (scope.documentType !== 'terminal-report') {
        throw new Error(
            'Legacy recovery is only available for Terminal Reports.',
        );
    }

    const parsed = JSON.parse(value) as Partial<
        Pick<UploadWizardState, 'stepData' | 'activeStepId'>
    >;

    if (
        !parsed.stepData ||
        typeof parsed.stepData !== 'object' ||
        typeof parsed.activeStepId !== 'string'
    ) {
        throw new Error('The legacy browser recovery snapshot is invalid.');
    }

    return serializeReportRecovery(
        scope,
        {
            stepData: parsed.stepData,
            activeStepId: parsed.activeStepId,
        },
        { draftVersion: null, updatedAt: null },
    );
}

export function parseReportRecovery(
    value: string,
    expectedScope: ReportRecoveryScope,
) {
    const parsed = JSON.parse(value) as unknown;

    if (
        !isRecoverySnapshot(parsed) ||
        !sameScope(parsed.scope, normalizedScope(expectedScope))
    ) {
        throw new Error('The browser recovery snapshot is invalid.');
    }

    return parsed;
}

export function reportRecoveryConflictsWithServer(
    snapshot: ReportRecoverySnapshot,
    server: ServerRecoveryVersion,
) {
    if (snapshot.scope.draftId === NEW_DRAFT_ID) {
        return false;
    }

    return (
        snapshot.baseServerDraftVersion !== server.draftVersion ||
        snapshot.baseServerUpdatedAt !== server.updatedAt
    );
}

export function mergeReportRecoveryStepData(
    serverStepData: UploadWizardState['stepData'],
    recoveredStepData: UploadWizardState['stepData'],
) {
    const merged = { ...serverStepData };

    for (const [stepId, recoveredData] of Object.entries(recoveredStepData)) {
        if (!recoveredData) {
            continue;
        }

        merged[stepId as UploadStepId] = {
            ...(serverStepData[stepId as UploadStepId] ?? {}),
            ...(recoveredData as UploadWizardStepData),
        };
    }

    return merged;
}

export function shouldPersistReportRecovery(status: UploadDraftStatus) {
    return status === 'unsaved' || status === 'error';
}
