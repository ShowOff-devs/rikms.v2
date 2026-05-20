import type {
    AccessType,
    MetadataField,
    UploadFileMock,
} from '@/types/agency-upload';

export type ResearchDocTypeStepData = {
    documentType: 'research' | null;
};

export type ResearchUploadStepData = {
    file: UploadFileMock | null;
    manualTitle: string;
};

export type ResearchMetadataStepData = {
    aiHasRun: boolean;
    metadata: MetadataField[];
};

export type ResearchSdgStepData = {
    selectedSdgs: number[];
    suggestedSdgs: number[];
};

export type ResearchAccessStepData = {
    accessType: AccessType;
    embargoDate: string;
    externalUrl: string;
};

export type ResearchReviewStepData = Record<string, never>;
