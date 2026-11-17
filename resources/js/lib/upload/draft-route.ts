import type { UploadWizardConfig } from '@/types/uploadWizard';

type DraftId = number | string | null | undefined;

export function buildUploadDraftPath(
    config: Pick<UploadWizardConfig, 'type' | 'draftRoute'>,
    draftId: DraftId,
): string | null {
    if (!config.draftRoute || config.draftRoute.documentType !== config.type) {
        return null;
    }

    const normalizedId = String(draftId ?? '').trim();

    if (!/^[1-9]\d*$/u.test(normalizedId)) {
        return null;
    }

    return `${config.draftRoute.basePath}/${normalizedId}`;
}
