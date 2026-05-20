export type ReportDocumentType = 'terminal-report' | 'project-accomplishment';

export type ReportWorkflowSelection = ReportDocumentType | 'research-study';

export type ReportUploadStatus = 'idle' | 'uploaded' | 'error';

export type ReportExtractionStatus = 'idle' | 'running' | 'success' | 'error';

export type ReportProjectStatus = 'not-started' | 'in-progress' | 'completed';

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
    uploadedFileName?: string;
    uploadedFileType?: string;
    uploadedFileSize?: number;
    reportTitle: string;
    reportDescription: string;
    reportingQuarter: string;
    reportingYear: string;
    agency: string;
    uploadStatus: ReportUploadStatus;
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
};

export type ReportPerformanceProject = {
    id: string;
    projectName: string;
    targetValue: number;
    actualValue: number;
    accomplishmentPercentage: number;
    projectStatus: ReportProjectStatus;
    remarks?: string;
};

export type ReportPerformanceData = {
    performanceProjects: ReportPerformanceProject[];
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
    allocatedBudget: number;
    usedBudget: number;
    remainingBalance: number;
    utilizationRate: number;
    financialValidated: boolean;
};

export type ReportHighlightsData = {
    highlightTitle: string;
    highlightDescription: string;
    supportingFiles: File[];
    featuredHighlight: boolean;
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
