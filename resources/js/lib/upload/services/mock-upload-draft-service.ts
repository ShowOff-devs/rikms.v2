import type {
    UploadDraftPayload,
    UploadDraftResult,
} from '@/types/uploadWizard';

const DRAFT_STORAGE_PREFIX = 'rikms-upload-draft';

function getDraftKey(flowType: UploadDraftPayload['flowType']) {
    return `${DRAFT_STORAGE_PREFIX}:${flowType}`;
}

export async function saveUploadDraft(
    payload: UploadDraftPayload,
): Promise<UploadDraftResult> {
    const savedAt = new Date().toISOString();
    const result = {
        id: `${payload.flowType}-draft`,
        savedAt,
    };

    window.localStorage.setItem(
        getDraftKey(payload.flowType),
        JSON.stringify({
            ...payload,
            savedAt,
        }),
    );

    await new Promise((resolve) => window.setTimeout(resolve, 250));

    return result;
}

export function getUploadDraft(flowType: UploadDraftPayload['flowType']) {
    const draft = window.localStorage.getItem(getDraftKey(flowType));

    return draft ? JSON.parse(draft) : null;
}
