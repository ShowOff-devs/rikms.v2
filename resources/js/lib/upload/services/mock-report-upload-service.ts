import {
    createReportReviewData,
    metadataFieldLabels,
} from '@/lib/upload/report-workflow';
import type {
    ReportAIMetadataFields,
    ReportDetailsData,
    ReportMetadataKey,
    ReportReviewData,
    ReportWorkflowData,
} from '@/types/upload/reportWorkflow';

export type MockUploadDocumentResult = {
    uploadedAt: string;
    fileName: string;
};

export type MockDraftResult = {
    id: string;
    savedAt: string;
};

export type MockSubmitResult = {
    id: string;
    submittedAt: string;
    status: 'submitted';
};

const reportMetadataKeys = Object.keys(
    metadataFieldLabels,
) as ReportMetadataKey[];

export async function mockUploadDocument(
    details: ReportDetailsData,
): Promise<MockUploadDocumentResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    return {
        uploadedAt: new Date().toISOString(),
        fileName: details.uploadedFileName ?? 'terminal-report.pdf',
    };
}

export async function mockRunAIMetadataExtraction(
    details: ReportDetailsData,
): Promise<{
    extractedMetadata: ReportAIMetadataFields;
    selectedPublicMetadata: ReportMetadataKey[];
    aiGeneratedFields: ReportMetadataKey[];
}> {
    await new Promise((resolve) => window.setTimeout(resolve, 800));

    const title =
        details.reportTitle.trim() ||
        details.uploadedFileName?.replace(/\.[^/.]+$/, '') ||
        'Regional Project Terminal Report';

    return {
        extractedMetadata: {
            title,
            abstract:
                'This terminal report summarizes implementation progress, regional outcomes, key performance indicators, and documented learnings for the reporting period.',
            methodology:
                'The report consolidates agency records, project monitoring data, accomplishment tables, stakeholder documentation, and financial utilization summaries.',
            reviewOfRelatedLiterature:
                'Related regional development studies and DOST program documentation were reviewed to align findings with institutional research priorities.',
            theoreticalFramework:
                'The report is anchored on results-based management, public value creation, and innovation ecosystem development for regional growth.',
            resultsAndDiscussion:
                'Implementation outputs indicate measurable progress in project delivery, stakeholder engagement, and knowledge transfer across beneficiary sectors.',
            keywords: [
                'regional development',
                'innovation',
                'project monitoring',
                'technology transfer',
            ],
            authors: ['DOST XI', details.agency],
        },
        selectedPublicMetadata: ['title', 'abstract', 'keywords', 'authors'],
        aiGeneratedFields: reportMetadataKeys,
    };
}

export async function mockSaveDraft(
    workflowData: ReportWorkflowData,
): Promise<MockDraftResult> {
    const savedAt = new Date().toISOString();

    window.localStorage.setItem(
        `rikms-report-draft:${workflowData.documentType}`,
        JSON.stringify({
            ...workflowData,
            details: {
                ...workflowData.details,
                uploadedFile: null,
            },
            highlights: {
                ...workflowData.highlights,
                supportingFiles: [],
            },
            savedAt,
        }),
    );

    await new Promise((resolve) => window.setTimeout(resolve, 250));

    return {
        id: `${workflowData.documentType}-draft`,
        savedAt,
    };
}

export async function mockSubmitDocument(
    workflowData: ReportWorkflowData,
): Promise<MockSubmitResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 500));

    return {
        id: `${workflowData.documentType}-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
    };
}

export function createSubmittedReviewState(
    submittedAt: string,
): ReportReviewData {
    return {
        ...createReportReviewData(),
        reviewStatus: 'reviewed',
        draftStatus: 'saved',
        submissionStatus: 'submitted',
        submittedAt,
    };
}
