import type {
    BeneficiarySector,
    ReportAIMetadataData,
    ReportAIMetadataFields,
    ReportDetailsData,
    ReportDocTypeData,
    ReportDocumentType,
    ReportFinancialsData,
    ReportHighlightsData,
    ReportMetadataKey,
    ReportPAPClassificationData,
    ReportPerformanceData,
    ReportPerformanceProject,
    ReportProjectStatus,
    ReportReviewData,
    ReportSDGTaggingData,
    ReportWorkflowData,
    ReportWorkflowSelection,
} from '@/types/upload/reportWorkflow';
import type { UploadStepId, UploadWizardState } from '@/types/uploadWizard';

export const REPORT_STEP_IDS = {
    docType: 'doc-type',
    details: 'details',
    aiMetadata: 'ai-metadata',
    performance: 'performance',
    papClassification: 'pap-classification',
    financials: 'financials',
    highlights: 'highlights',
    sdgTagging: 'sdg-tagging',
    review: 'review',
} as const satisfies Record<string, UploadStepId>;

export const reportStepLabels: Record<UploadStepId, string> = {
    'doc-type': 'Doc Type',
    upload: 'Upload',
    details: 'Details',
    'ai-metadata': 'AI Metadata',
    performance: 'Performance',
    'pap-classification': 'PAP Class.',
    financials: 'Financials',
    highlights: 'Highlights',
    'sdg-tagging': 'SDG Tagging',
    access: 'Access',
    review: 'Review',
};

export const metadataFieldLabels: Record<ReportMetadataKey, string> = {
    title: 'Title',
    abstract: 'Abstract',
    methodology: 'Methodology',
    reviewOfRelatedLiterature: 'Review of Related Literature',
    theoreticalFramework: 'Theoretical Framework',
    resultsAndDiscussion: 'Results and Discussion',
    keywords: 'Keywords',
    authors: 'Authors',
};

export const papCategoryOptions = [
    'Research and Development',
    'Technology Transfer',
    'Innovation Support',
    'Science Education',
    'Regional Development',
    'Policy and Planning',
];

export const beneficiarySectorOptions: {
    value: BeneficiarySector;
    label: string;
}[] = [
    { value: 'government', label: 'Government' },
    { value: 'academe', label: 'Academe' },
    { value: 'business', label: 'Business' },
    { value: 'civil-society', label: 'Civil Society' },
    { value: 'media', label: 'Media' },
];

export const sdgOptions = [
    { id: 1, name: 'No Poverty', color: '#e5243b' },
    { id: 2, name: 'Zero Hunger', color: '#dda63a' },
    { id: 3, name: 'Good Health', color: '#4c9f38' },
    { id: 4, name: 'Quality Education', color: '#c5192d' },
    { id: 5, name: 'Gender Equality', color: '#ff3a21' },
    { id: 6, name: 'Clean Water', color: '#26bde2' },
    { id: 7, name: 'Affordable & Clean Energy', color: '#fcc30b' },
    { id: 8, name: 'Decent Work', color: '#a21942' },
    { id: 9, name: 'Industry, Innovation & Infrastructure', color: '#fd6925' },
    { id: 10, name: 'Reduced Inequalities', color: '#dd1367' },
    { id: 11, name: 'Sustainable Cities', color: '#fd9d24' },
    { id: 12, name: 'Responsible Consumption', color: '#bf8b2e' },
    { id: 13, name: 'Climate Action', color: '#3f7e44' },
    { id: 14, name: 'Life Below Water', color: '#0a97d9' },
    { id: 15, name: 'Life on Land', color: '#56c02b' },
    { id: 16, name: 'Peace, Justice & Strong Institutions', color: '#00689d' },
    { id: 17, name: 'Partnerships for the Goals', color: '#19486a' },
];

const emptyMetadata: ReportAIMetadataFields = {
    title: '',
    abstract: '',
    methodology: '',
    reviewOfRelatedLiterature: '',
    theoreticalFramework: '',
    resultsAndDiscussion: '',
    keywords: [],
    authors: [],
};

function createReportRowId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `report-row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createReportDocTypeData(
    documentType: ReportDocumentType,
): ReportDocTypeData {
    return {
        documentType,
        selectedWorkflow: documentType,
    };
}

export function createReportDetailsData(): ReportDetailsData {
    return {
        uploadedFile: null,
        uploadedFileName: undefined,
        uploadedFileType: undefined,
        uploadedFileSize: undefined,
        reportTitle: '',
        reportDescription: '',
        reportingQuarter: '',
        reportingYear: '2026',
        agency: 'Department of Science and Technology - Region XI',
        uploadStatus: 'idle',
    };
}

export function createReportAIMetadataData(): ReportAIMetadataData {
    return {
        aiAnalysisStarted: false,
        aiAnalysisCompleted: false,
        extractionStatus: 'idle',
        extractedMetadata: { ...emptyMetadata },
        selectedPublicMetadata: [],
        aiGeneratedFields: [],
        userEditedFields: [],
        metadataValidated: false,
    };
}

export function createPerformanceProject(
    projectName = 'Untitled Report',
): ReportPerformanceProject {
    return {
        id: createReportRowId(),
        projectName,
        targetValue: 0,
        actualValue: 0,
        accomplishmentPercentage: 0,
        projectStatus: 'not-started',
        remarks: '',
    };
}

export function createReportPerformanceData(): ReportPerformanceData {
    return {
        performanceProjects: [],
        performanceRemarks: '',
    };
}

export function createReportPAPClassificationData(): ReportPAPClassificationData {
    return {
        papCategories: [],
        aiSuggestedPAPCategories: [
            'Research and Development',
            'Regional Development',
        ],
        papDescription: '',
        beneficiarySectors: [],
        aiSuggestionApplied: false,
    };
}

export function createReportFinancialsData(): ReportFinancialsData {
    return {
        allocatedBudget: 0,
        usedBudget: 0,
        remainingBalance: 0,
        utilizationRate: 0,
        financialValidated: false,
    };
}

export function createReportHighlightsData(): ReportHighlightsData {
    return {
        highlightTitle: '',
        highlightDescription: '',
        supportingFiles: [],
        featuredHighlight: false,
    };
}

export function createReportSDGTaggingData(): ReportSDGTaggingData {
    return {
        selectedSDGs: [9, 17],
        aiSuggestedSDGs: [9, 17],
        aiSuggestionsApplied: true,
        sdgSelectionValidated: true,
    };
}

export function createReportReviewData(): ReportReviewData {
    return {
        reviewStatus: 'not-reviewed',
        draftStatus: 'not-saved',
        submissionStatus: 'draft',
        submittedAt: undefined,
    };
}

export function createInitialReportWorkflowData(
    documentType: ReportDocumentType,
): ReportWorkflowData {
    return {
        documentType,
        selectedWorkflow: documentType,
        details: createReportDetailsData(),
        aiMetadata: createReportAIMetadataData(),
        performance: createReportPerformanceData(),
        papClassification: createReportPAPClassificationData(),
        financials: createReportFinancialsData(),
        highlights: createReportHighlightsData(),
        sdgTagging: createReportSDGTaggingData(),
        review: createReportReviewData(),
    };
}

export function calculateProjectStatus(
    accomplishmentPercentage: number,
): ReportProjectStatus {
    if (accomplishmentPercentage >= 100) {
        return 'completed';
    }

    if (accomplishmentPercentage > 0) {
        return 'in-progress';
    }

    return 'not-started';
}

export function calculatePerformanceProject(
    project: ReportPerformanceProject,
): ReportPerformanceProject {
    const accomplishmentPercentage =
        project.targetValue > 0
            ? Math.round((project.actualValue / project.targetValue) * 100)
            : 0;

    return {
        ...project,
        accomplishmentPercentage,
        projectStatus: calculateProjectStatus(accomplishmentPercentage),
    };
}

export function calculateFinancials(
    allocatedBudget: number,
    usedBudget: number,
): Pick<
    ReportFinancialsData,
    'remainingBalance' | 'utilizationRate' | 'financialValidated'
> {
    const remainingBalance = allocatedBudget - usedBudget;
    const utilizationRate =
        allocatedBudget > 0
            ? Math.round((usedBudget / allocatedBudget) * 100)
            : 0;

    return {
        remainingBalance,
        utilizationRate,
        financialValidated:
            allocatedBudget > 0 &&
            usedBudget >= 0 &&
            usedBudget <= allocatedBudget,
    };
}

export function formatPeso(value: number) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
}

export function getReportTypeLabel(
    value: ReportWorkflowSelection | ReportDocumentType,
) {
    if (value === 'terminal-report') {
        return 'Terminal Report';
    }

    if (value === 'project-accomplishment') {
        return 'Project Accomplishment Report';
    }

    return 'Research Study';
}

export function buildReportWorkflowData(
    documentType: ReportDocumentType,
    stepData: UploadWizardState['stepData'],
): ReportWorkflowData {
    const defaults = createInitialReportWorkflowData(documentType);
    const docType = stepData[REPORT_STEP_IDS.docType] as
        | ReportDocTypeData
        | undefined;

    return {
        ...defaults,
        documentType: docType?.documentType ?? documentType,
        selectedWorkflow: docType?.selectedWorkflow ?? documentType,
        details:
            (stepData[REPORT_STEP_IDS.details] as ReportDetailsData) ??
            defaults.details,
        aiMetadata:
            (stepData[REPORT_STEP_IDS.aiMetadata] as ReportAIMetadataData) ??
            defaults.aiMetadata,
        performance:
            (stepData[REPORT_STEP_IDS.performance] as ReportPerformanceData) ??
            defaults.performance,
        papClassification:
            (stepData[
                REPORT_STEP_IDS.papClassification
            ] as ReportPAPClassificationData) ?? defaults.papClassification,
        financials:
            (stepData[REPORT_STEP_IDS.financials] as ReportFinancialsData) ??
            defaults.financials,
        highlights:
            (stepData[REPORT_STEP_IDS.highlights] as ReportHighlightsData) ??
            defaults.highlights,
        sdgTagging:
            (stepData[REPORT_STEP_IDS.sdgTagging] as ReportSDGTaggingData) ??
            defaults.sdgTagging,
        review:
            (stepData[REPORT_STEP_IDS.review] as ReportReviewData) ??
            defaults.review,
    };
}

export function reportReadinessCount(data: ReportWorkflowData) {
    return [
        Boolean(data.selectedWorkflow),
        data.details.uploadStatus === 'uploaded' &&
            Boolean(data.details.reportTitle.trim()) &&
            Boolean(data.details.reportingQuarter) &&
            Boolean(data.details.reportingYear),
        data.aiMetadata.aiAnalysisCompleted &&
            data.aiMetadata.selectedPublicMetadata.length > 0,
        data.performance.performanceProjects.length > 0,
        data.papClassification.papCategories.length > 0,
        data.financials.financialValidated,
        Boolean(data.highlights.highlightTitle.trim()) &&
            data.highlights.highlightDescription.trim().length >= 40,
        data.sdgTagging.selectedSDGs.length > 0,
        data.review.reviewStatus === 'reviewed' ||
            data.review.submissionStatus !== 'draft',
    ].filter(Boolean).length;
}
