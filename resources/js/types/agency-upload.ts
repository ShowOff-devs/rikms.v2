export type DocumentType =
    | 'research'
    | 'terminal-report'
    | 'project-accomplishment';

export type MetadataKey =
    | 'title'
    | 'abstract'
    | 'methodology'
    | 'reviewOfRelatedLiterature'
    | 'theoreticalFramework'
    | 'resultsAndDiscussion'
    | 'keywords'
    | 'authors';

export type MetadataField = {
    key: MetadataKey;
    label: string;
    value: string;
    isPublic: boolean;
};

export type AccessType =
    | 'public'
    | 'request'
    | 'restricted'
    | 'embargo'
    | 'external-link';

export type UploadFileMock = {
    name: string;
    size: number;
    type: string;
};

export type ResearchUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export type ResearchSubmissionStatus =
    | 'draft'
    | 'validating'
    | 'ready'
    | 'submitting'
    | 'submitted'
    | 'error';

export type AgencyUploadState = {
    documentType: DocumentType | null;
    file: UploadFileMock | null;
    manualTitle: string;
    uploadStatus: ResearchUploadStatus;
    aiHasRun: boolean;
    metadata: MetadataField[];
    aiSuggestedSdgs: number[];
    selectedSdgs: number[];
    accessType: AccessType;
    embargoDate: string;
    externalUrl: string;
    researchOwnerName: string;
    researchOwnerEmail: string;
    notifyAccessRequests: boolean;
    notifyResearchInquiries: boolean;
    sendCopyToAdmin: boolean;
    submissionStatus: ResearchSubmissionStatus;
    validationResults: string[];
    submissionTimestamp: string | null;
};
