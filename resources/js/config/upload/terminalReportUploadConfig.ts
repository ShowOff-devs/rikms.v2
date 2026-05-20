import ReportDetailsStep from '@/components/upload/reports/ReportDetailsStep';
import ReportDocumentTypeStep from '@/components/upload/reports/ReportDocumentTypeStep';
import ReportFinancialsStep from '@/components/upload/reports/ReportFinancialsStep';
import ReportHighlightsStep from '@/components/upload/reports/ReportHighlightsStep';
import ReportMetadataStep from '@/components/upload/reports/ReportMetadataStep';
import ReportPAPClassificationStep from '@/components/upload/reports/ReportPAPClassificationStep';
import ReportPerformanceStep from '@/components/upload/reports/ReportPerformanceStep';
import ReportReviewStep from '@/components/upload/reports/ReportReviewStep';
import ReportSDGStep from '@/components/upload/reports/ReportSDGStep';
import {
    createReportAIMetadataData,
    createReportDetailsData,
    createReportDocTypeData,
    createReportFinancialsData,
    createReportHighlightsData,
    createReportPAPClassificationData,
    createReportPerformanceData,
    createReportReviewData,
    createReportSDGTaggingData,
} from '@/lib/upload/report-workflow';
import { reportStepSchemas } from '@/lib/upload/validation';
import type { UploadWizardConfig } from '@/types/uploadWizard';

export const terminalReportUploadConfig: UploadWizardConfig = {
    type: 'terminal-report',
    title: 'Terminal Report Upload',
    description:
        'Prepare a terminal report submission with the full 9-step workflow.',
    eyebrow: 'Terminal Report',
    defaultStartStepId: 'details',
    initialCompletedStepIds: ['doc-type'],
    lockedStepIds: ['doc-type'],
    startStepBackHref: '/agency/upload',
    steps: [
        {
            id: 'doc-type',
            title: 'Doc Type',
            description: 'Confirm this submission as a terminal report.',
            defaultValues: createReportDocTypeData('terminal-report'),
            schema: reportStepSchemas.docType,
            component: ReportDocumentTypeStep,
        },
        {
            id: 'details',
            title: 'Details',
            description: 'Capture project and report details.',
            defaultValues: createReportDetailsData(),
            schema: reportStepSchemas.details,
            component: ReportDetailsStep,
        },
        {
            id: 'ai-metadata',
            title: 'AI Metadata',
            description: 'Review extracted metadata when AI support is added.',
            defaultValues: createReportAIMetadataData(),
            schema: reportStepSchemas.aiMetadata,
            component: ReportMetadataStep,
        },
        {
            id: 'performance',
            title: 'Performance',
            description: 'Document project performance indicators.',
            defaultValues: createReportPerformanceData(),
            schema: reportStepSchemas.performance,
            component: ReportPerformanceStep,
        },
        {
            id: 'pap-classification',
            title: 'PAP Classification',
            description: 'Classify the report under the appropriate PAP.',
            defaultValues: createReportPAPClassificationData(),
            schema: reportStepSchemas.papClassification,
            component: ReportPAPClassificationStep,
        },
        {
            id: 'financials',
            title: 'Financials',
            description: 'Capture budget and expenditure information.',
            defaultValues: createReportFinancialsData(),
            schema: reportStepSchemas.financials,
            component: ReportFinancialsStep,
        },
        {
            id: 'highlights',
            title: 'Highlights',
            description: 'Summarize accomplishments, issues, and outcomes.',
            defaultValues: createReportHighlightsData(),
            schema: reportStepSchemas.highlights,
            component: ReportHighlightsStep,
        },
        {
            id: 'sdg-tagging',
            title: 'SDG Tagging',
            description: 'Tag the report against relevant SDG goals.',
            defaultValues: createReportSDGTaggingData(),
            schema: reportStepSchemas.sdgTagging,
            component: ReportSDGStep,
            nextLabel: 'Review & Submit',
        },
        {
            id: 'review',
            title: 'Review',
            description: 'Review the prepared terminal report submission.',
            defaultValues: createReportReviewData(),
            schema: reportStepSchemas.review,
            component: ReportReviewStep,
            hideNavigation: true,
        },
    ],
};
