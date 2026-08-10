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

export const OFFICIAL_CALCULATED_TOLERANCE = 5;

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
        researchId: undefined,
        uploadedFileId: undefined,
        uploadedFileName: undefined,
        uploadedFileType: undefined,
        uploadedFileSize: undefined,
        uploadError: null,
        reportTitle: '',
        reportDescription: '',
        projectStartDate: '',
        projectEndDate: '',
        reportingPeriod: '',
        reportingYear: String(new Date().getFullYear()),
        agency: '',
        uploadStatus: 'idle',
        lastWizardStep: null,
        serverUpdatedAt: null,
        serverDraftVersion: null,
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
        analysisMessage: null,
    };
}

export function createPerformanceProject(
    projectName = '',
): ReportPerformanceProject {
    return {
        id: createReportRowId(),
        projectName,
        targetValue: null,
        actualValue: null,
        targetNumericValue: null,
        actualNumericValue: null,
        unit: '',
        accomplishmentPercentage: null,
        projectStatus: 'not-reported',
        remarks: '',
    };
}

export function createReportPerformanceData(): ReportPerformanceData {
    return {
        performanceProjects: [],
        physicalAccomplishmentPercent: null,
        performanceRemarks: '',
    };
}

export function createReportPAPClassificationData(): ReportPAPClassificationData {
    return {
        papCategories: [],
        aiSuggestedPAPCategories: [],
        papDescription: '',
        beneficiarySectors: [],
        aiSuggestionApplied: false,
    };
}

export function createReportFinancialsData(): ReportFinancialsData {
    return {
        allocatedBudget: null,
        releasedAmount: null,
        obligatedAmount: null,
        usedBudget: null,
        financialAsOfDate: '',
        remainingBalance: null,
        utilizationRate: null,
        financialValidated: false,
    };
}

export function createReportHighlightsData(): ReportHighlightsData {
    return {
        highlightTitle: '',
        highlightDescription: '',
        supportingFiles: [],
        featuredHighlight: false,
        uploadError: null,
    };
}

export function createReportSDGTaggingData(): ReportSDGTaggingData {
    return {
        selectedSDGs: [],
        aiSuggestedSDGs: [],
        aiSuggestionsApplied: false,
        sdgSelectionValidated: false,
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
    accomplishmentPercentage: number | null,
): ReportProjectStatus {
    if (accomplishmentPercentage === null) {
        return 'not-reported';
    }

    if (accomplishmentPercentage <= 0) {
        return 'not-started';
    }

    if (accomplishmentPercentage >= 100) {
        return 'completed';
    }

    if (accomplishmentPercentage >= 80) {
        return 'substantially-complete';
    }

    return 'in-progress';
}

export function calculatePerformanceProject(
    project: ReportPerformanceProject,
): ReportPerformanceProject {
    const targetValue = project.targetNumericValue;
    const actualValue = project.actualNumericValue;
    const canCalculate =
        targetValue !== null &&
        actualValue !== null &&
        targetValue > 0 &&
        actualValue >= 0;
    const accomplishmentPercentage = canCalculate
        ? Math.round((actualValue / targetValue) * 10000) / 100
        : null;

    return {
        ...project,
        accomplishmentPercentage,
        projectStatus: calculateProjectStatus(accomplishmentPercentage),
    };
}

export function reportAccomplishmentSummary(
    performance: ReportPerformanceData,
) {
    const percentages = performance.performanceProjects
        .map((project) => project.accomplishmentPercentage)
        .filter((value): value is number => value !== null);
    const calculatedPercentage =
        percentages.length > 0
            ? Math.round(
                  (percentages.reduce((total, value) => total + value, 0) /
                      percentages.length) *
                      100,
              ) / 100
            : null;
    const officialPercentage = performance.physicalAccomplishmentPercent;

    return {
        officialPercentage,
        calculatedPercentage,
        displayPercentage: officialPercentage ?? calculatedPercentage,
        source: officialPercentage !== null ? 'official' : 'calculated',
        difference:
            officialPercentage !== null && calculatedPercentage !== null
                ? Math.round(
                      Math.abs(officialPercentage - calculatedPercentage) * 100,
                  ) / 100
                : null,
    };
}

export function calculateFinancials(
    allocatedBudget: number | null,
    usedBudget: number | null,
): Pick<
    ReportFinancialsData,
    'remainingBalance' | 'utilizationRate' | 'financialValidated'
> {
    const remainingBalance =
        allocatedBudget !== null && usedBudget !== null
            ? allocatedBudget - usedBudget
            : null;
    const utilizationRate =
        allocatedBudget !== null && usedBudget !== null && allocatedBudget > 0
            ? Math.round((usedBudget / allocatedBudget) * 100)
            : null;

    return {
        remainingBalance,
        utilizationRate,
        financialValidated:
            allocatedBudget !== null &&
            usedBudget !== null &&
            allocatedBudget >= 0 &&
            usedBudget >= 0,
    };
}

export function formatPeso(value: number | null) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(value !== null && Number.isFinite(value) ? value : 0);
}

export function reportFinancialWarnings(
    financials: ReportFinancialsData,
    details: Pick<ReportDetailsData, 'projectStartDate' | 'projectEndDate'>,
) {
    const warnings: string[] = [];
    const allottedBudget = financials.allocatedBudget;
    const releasedAmount = financials.releasedAmount;
    const obligatedAmount = financials.obligatedAmount;
    const utilizedAmount = financials.usedBudget;

    if (
        allottedBudget !== null &&
        releasedAmount !== null &&
        releasedAmount > allottedBudget
    ) {
        warnings.push(
            'The released amount exceeds the allotted budget. Please verify the financial figures before submission.',
        );
    }

    if (
        allottedBudget !== null &&
        obligatedAmount !== null &&
        obligatedAmount > allottedBudget
    ) {
        warnings.push(
            'The obligated amount exceeds the allotted budget. Please verify the financial figures before submission.',
        );
    }

    if (
        allottedBudget !== null &&
        utilizedAmount !== null &&
        utilizedAmount > allottedBudget
    ) {
        warnings.push(
            'The utilized amount exceeds the allotted budget. Please verify the financial figures before submission.',
        );
    }

    if (
        releasedAmount !== null &&
        utilizedAmount !== null &&
        utilizedAmount > releasedAmount
    ) {
        warnings.push(
            'The utilized amount exceeds the released amount. Please verify the financial figures before submission.',
        );
    }

    const asOfDate = dateValue(financials.financialAsOfDate);
    const projectStartDate = dateValue(details.projectStartDate);
    const projectEndDate = dateValue(details.projectEndDate);

    if (
        asOfDate !== null &&
        ((projectStartDate !== null && asOfDate < projectStartDate) ||
            (projectEndDate !== null && asOfDate > projectEndDate))
    ) {
        warnings.push(
            'The financial as-of date is outside the project date range. Please verify the reporting date before submission.',
        );
    }

    return warnings;
}

function dateValue(value: string): number | null {
    if (!value.trim()) {
        return null;
    }

    const timestamp = Date.parse(value);

    return Number.isFinite(timestamp) ? timestamp : null;
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
            Boolean(
                data.details.reportTitle.trim() ||
                data.aiMetadata.extractedMetadata.title.trim() ||
                data.details.uploadedFileName,
            ) &&
            Boolean(data.details.reportingPeriod) &&
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
