import {
    getAccessLabel,
    getDisplayTitle,
    mockExtractedMetadata,
} from '@/lib/agency/upload-research-service';
import type {
    AgencyUploadState,
    MetadataField,
    UploadFileMock,
} from '@/types/agency-upload';

const wait = (ms: number) =>
    new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });

export async function mockUploadResearchFile(
    file: File,
): Promise<UploadFileMock> {
    // TODO Phase 5: Delete after all upload entry points use the real research file API.
    await wait(450);

    return {
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop() || 'document',
    };
}

export async function mockRunResearchMetadataExtraction(
    state: AgencyUploadState,
): Promise<{ metadata: MetadataField[]; aiSuggestedSDGs: number[] }> {
    // TODO Phase 5: Replace mock AI metadata when queued PDF/AI/SDG result APIs are ready.
    await wait(850);

    return {
        metadata: mockExtractedMetadata.map((field) =>
            field.key === 'title' && state.manualTitle.trim()
                ? { ...field, value: state.manualTitle.trim() }
                : field,
        ),
        aiSuggestedSDGs: [9, 8, 17],
    };
}

export async function mockSaveResearchDraft(state: AgencyUploadState) {
    // TODO Phase 5: Delete after all draft entry points use the real agency research API.
    await wait(350);

    return {
        id: `research-draft-${Date.now()}`,
        title: getDisplayTitle(state),
        savedAt: new Date().toISOString(),
    };
}

export async function mockValidateResearchSubmission(state: AgencyUploadState) {
    await wait(250);

    const checks = [
        state.documentType === 'research' ? 'Document type confirmed' : '',
        state.file && state.uploadStatus === 'uploaded' ? 'File uploaded' : '',
        state.aiHasRun && state.metadata.some((field) => field.isPublic)
            ? 'Public metadata selected'
            : '',
        state.selectedSdgs.length > 0 ? 'SDG tags selected' : '',
        canUseAccessSettings(state)
            ? `Access set to ${getAccessLabel(state.accessType)}`
            : '',
    ].filter(Boolean);

    return {
        passed: checks.length === 5,
        checks,
    };
}

export async function mockSubmitResearch(state: AgencyUploadState) {
    // TODO Phase 5: Delete after all submit entry points use the real agency research API.
    const validation = await mockValidateResearchSubmission(state);

    if (!validation.passed) {
        throw new Error('Research submission is incomplete.');
    }

    await wait(700);

    return {
        id: `research-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        title: getDisplayTitle(state),
    };
}

function canUseAccessSettings(state: AgencyUploadState) {
    if (state.accessType === 'embargo') {
        return Boolean(state.embargoDate);
    }

    if (state.accessType === 'external-link') {
        return Boolean(state.externalUrl.trim());
    }

    return Boolean(state.accessType);
}
