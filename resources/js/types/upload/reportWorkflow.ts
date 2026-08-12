export type ReportDocumentType = 'terminal-report' | 'project-accomplishment';

export type ReportWorkflowSelection = ReportDocumentType | 'research-study';

export type ReportUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export type ReportExtractionStatus = 'idle' | 'running' | 'success' | 'error';

export type ReportProjectStatus =
    | 'not-reported'
    | 'not-started'
    | 'in-progress'
    | 'substantially-complete'
    | 'completed';

export type BeneficiarySector =
    | 'government'
    | 'academe'
    | 'business'
    | 'civil-society'
    | 'media';

export type ReportReviewStatus = 'not-reviewed' | 'reviewed';

export type ReportDraftStatus = 'not-saved' | 'saved';

export type ReportSubmissionStatus = 'draft' | 'pending' | 'submitted';

export type ReportMetadataKey =
    | 'title'
    | 'abstract'
    | 'methodology'
    | 'reviewOfRelatedLiterature'
    | 'theoreticalFramework'
    | 'resultsAndDiscussion'
    | 'keywords'
    | 'authors';

export type ReportDocTypeData = {
    documentType: ReportDocumentType;
    selectedWorkflow: ReportWorkflowSelection;
};

export type ReportDetailsData = {
    uploadedFile: File | null;
    researchId?: string;
    uploadedFileId?: string;
    uploadedFileName?: string;
    uploadedFileType?: string;
    uploadedFileSize?: number;
    uploadError?: string | null;
    reportTitle: string;
    reportDescription: string;
    projectStartDate: string;
    projectEndDate: string;
    reportingPeriod: string;
    reportingYear: string;
    agency: string;
    uploadStatus: ReportUploadStatus;
    lastWizardStep?: string | null;
    serverUpdatedAt?: string | null;
    serverDraftVersion?: number | null;
};

export type ReportAIMetadataFields = {
    title: string;
    abstract: string;
    methodology: string;
    reviewOfRelatedLiterature: string;
    theoreticalFramework: string;
    resultsAndDiscussion: string;
    keywords: string[];
    authors: string[];
};

export type ReportAIMetadataData = {
    aiAnalysisStarted: boolean;
    aiAnalysisCompleted: boolean;
    extractionStatus: ReportExtractionStatus;
    extractedMetadata: ReportAIMetadataFields;
    selectedPublicMetadata: ReportMetadataKey[];
    aiGeneratedFields: ReportMetadataKey[];
    userEditedFields: ReportMetadataKey[];
    metadataValidated: boolean;
    analysisMessage?: string | null;
};

export type ReportPerformanceProject = {
    id: string;
    projectName: string;
    targetValue: string | null;
    actualValue: string | null;
    targetNumericValue: number | null;
    actualNumericValue: number | null;
    unit: string;
    accomplishmentPercentage: number | null;
    projectStatus: ReportProjectStatus;
    remarks?: string;
};

export type ReportPerformanceData = {
    performanceProjects: ReportPerformanceProject[];
    physicalAccomplishmentPercent: number | null;
    performanceRemarks?: string;
};

export type ReportPAPClassificationData = {
    papCategories: string[];
    aiSuggestedPAPCategories: string[];
    papDescription: string;
    beneficiarySectors: BeneficiarySector[];
    aiSuggestionApplied: boolean;
};

export type ReportFinancialsData = {
    allocatedBudget: number | null;
    releasedAmount: number | null;
    obligatedAmount: number | null;
    usedBudget: number | null;
    financialAsOfDate: string;
    remainingBalance: number | null;
    utilizationRate: number | null;
    financialValidated: boolean;
};

export type ReportHighlightsData = {
    highlightId?: string;
    highlightTitle: string;
    highlightDescription: string;
    supportingFiles: ReportHighlightSupportingFile[];
    featuredHighlight: boolean;
    uploadError?: string | null;
};

export type ReportHighlightSupportingFile = {
    id: string;
    name: string;
    size: number;
    type: string;
};

export type ReportSDGTaggingData = {
    selectedSDGs: number[];
    aiSuggestedSDGs: number[];
    aiSuggestionsApplied: boolean;
    sdgSelectionValidated: boolean;
};

export type ReportReviewData = {
    reviewStatus: ReportReviewStatus;
    draftStatus: ReportDraftStatus;
    submissionStatus: ReportSubmissionStatus;
    submittedAt?: string;
};

export type ReportWorkflowData = {
    documentType: ReportDocumentType;
    selectedWorkflow: ReportWorkflowSelection;
    details: ReportDetailsData;
    aiMetadata: ReportAIMetadataData;
    performance: ReportPerformanceData;
    papClassification: ReportPAPClassificationData;
    financials: ReportFinancialsData;
    highlights: ReportHighlightsData;
    sdgTagging: ReportSDGTaggingData;
    review: ReportReviewData;
};

export type TerminalReportWorkflowData = ReportWorkflowData & {
    documentType: 'terminal-report';
};

export type ProjectAccomplishmentReportWorkflowData = ReportWorkflowData & {
    documentType: 'project-accomplishment';
};
