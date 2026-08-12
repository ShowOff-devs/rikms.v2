import {
    getAgencyAiResults,
    processAgencyAiResults,
} from '@/lib/agency/agency-ai-results-service';
import type {
    AgencyAiResultSection,
    AgencyAiResults,
} from '@/lib/agency/agency-ai-results-service';
import {
    createAgencyResearchDraft,
    submitAgencyResearch,
    updateAgencyResearchDraft,
} from '@/lib/agency/agency-research-service';
import type {
    AgencyResearchPayload,
    AgencyResearchRecord,
    AgencyResearchPerformanceItem,
    AgencyResearchReportDetail,
    AgencyResearchHighlight,
    AgencyResearchFile,
    PublicMetadataField,
} from '@/lib/agency/agency-research-service';
import { fetchApi } from '@/lib/api-client';
import {
    calculateFinancials,
    createInitialReportWorkflowData,
    getReportTypeLabel,
    metadataFieldLabels,
} from '@/lib/upload/report-workflow';
import type { MetadataKey } from '@/types/agency-upload';
import type {
    ReportAIMetadataFields,
    ReportDetailsData,
    ReportDocumentType,
    ReportMetadataKey,
    ReportProjectStatus,
    ReportWorkflowData,
} from '@/types/upload/reportWorkflow';

type ReportFileRecord = {
    id: number;
    research_id: number;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    status: string;
    uploaded_at?: string | null;
};

const reportProjectStatuses: ReportProjectStatus[] = [
    'not-reported',
    'not-started',
    'in-progress',
    'substantially-complete',
    'completed',
];

export type ReportFileUploadResult = {
    id: string;
    researchId: string;
    name: string;
    size: number;
    type: string;
};

export type ReportAIMetadataResult = {
    extractedMetadata: ReportAIMetadataFields;
    selectedPublicMetadata: ReportMetadataKey[];
    aiGeneratedFields: ReportMetadataKey[];
    analysisMessage: string | null;
};

const reportMetadataKeys = Object.keys(
    metadataFieldLabels,
) as ReportMetadataKey[];
const aiResultsPollIntervalMs = 3000;
const aiResultsPollTimeoutMs = 30000;
const successfulAiStatuses = ['completed', 'pending_review'];
export const reportHighlightFileLimit = 5;
export const reportHighlightFileMaxBytes = 20 * 1024 * 1024;

export function reportHighlightFileError(
    file: Pick<File, 'name' | 'size' | 'type'>,
    existingCount: number,
    maxBytes = reportHighlightFileMaxBytes,
) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedMimeByExtension: Record<string, string[]> = {
        pdf: ['application/pdf'],
        png: ['image/png'],
        jpg: ['image/jpeg'],
        jpeg: ['image/jpeg'],
    };

    if (
        !extension ||
        !allowedMimeByExtension[extension] ||
        !allowedMimeByExtension[extension].includes(file.type)
    ) {
        return 'Supporting files must be valid PDF, PNG, or JPEG files.';
    }

    if (file.size <= 0 || file.size > maxBytes) {
        return `Supporting files must be non-empty and may not exceed ${Math.floor(maxBytes / 1024 / 1024)} MB.`;
    }

    if (existingCount >= reportHighlightFileLimit) {
        return `A highlight may have at most ${reportHighlightFileLimit} supporting files.`;
    }

    return null;
}

const reportKeyToApiKey: Record<ReportMetadataKey, MetadataKey> = {
    title: 'title',
    abstract: 'abstract',
    methodology: 'methodology',
    reviewOfRelatedLiterature: 'review_of_related_literature',
    theoreticalFramework: 'theoretical_framework',
    resultsAndDiscussion: 'results_and_discussion',
    keywords: 'keywords',
    authors: 'authors',
};

const apiKeyToReportKey = Object.fromEntries(
    Object.entries(reportKeyToApiKey).map(([reportKey, apiKey]) => [
        apiKey,
        reportKey,
    ]),
) as Record<MetadataKey, ReportMetadataKey>;

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function aiResultStatus(section: AgencyAiResultSection | undefined) {
    return section?.processing_status ?? section?.status ?? 'not_available';
}

function isSuccessfulAiStatus(status: string) {
    return successfulAiStatuses.includes(status);
}

function shouldPollAiStatus(status: string) {
    return ['queued', 'processing', 'not_available'].includes(status);
}

function firstProcessingError(section: AgencyAiResultSection | undefined) {
    return section?.processing_errors?.find((error) => error.trim() !== '');
}

function usefulAiMessage(
    section: AgencyAiResultSection | undefined,
    status: string,
) {
    const message = firstProcessingError(section) ?? section?.message;

    if (
        message &&
        message !==
            'No AI/PDF/SDG result is available for this research record yet.'
    ) {
        return message;
    }

    if (isSuccessfulAiStatus(status)) {
        return null;
    }

    if (status === 'failed') {
        return 'AI metadata extraction failed. You can fill the metadata fields manually.';
    }

    if (status === 'skipped') {
        return 'AI metadata extraction is unavailable in this environment. You can fill the metadata fields manually.';
    }

    return 'AI metadata extraction is not available yet. You can fill the metadata fields manually.';
}

async function pollAgencyAiResults(
    researchId: string,
    initialResults?: AgencyAiResults,
) {
    const startedAt = Date.now();
    let results = initialResults ?? (await getAgencyAiResults(researchId));

    while (
        shouldPollAiStatus(aiResultStatus(results.ai_metadata)) &&
        Date.now() - startedAt < aiResultsPollTimeoutMs
    ) {
        await sleep(aiResultsPollIntervalMs);
        results = await getAgencyAiResults(researchId);
    }

    return results;
}

function fileBaseName(fileName?: string) {
    return fileName?.replace(/\.[^/.]+$/u, '') ?? '';
}

function textValue(metadata: ReportAIMetadataFields, key: ReportMetadataKey) {
    const value = metadata[key];

    return Array.isArray(value) ? value.join(', ') : value;
}

function metadataFromAi(
    details: ReportDetailsData,
    section: AgencyAiResultSection,
): ReportAIMetadataFields {
    return {
        title:
            section.extracted_title?.trim() ||
            details.reportTitle.trim() ||
            fileBaseName(details.uploadedFileName),
        abstract: section.extracted_abstract ?? '',
        methodology: section.extracted_methodology ?? '',
        reviewOfRelatedLiterature:
            section.extracted_review_of_related_literature ?? '',
        theoreticalFramework: section.extracted_theoretical_framework ?? '',
        resultsAndDiscussion: section.extracted_results_and_discussion ?? '',
        keywords: section.extracted_keywords ?? [],
        authors: section.extracted_authors ?? [],
    };
}

function defaultMetadata(details: ReportDetailsData): ReportAIMetadataFields {
    return {
        title:
            details.reportTitle.trim() ||
            fileBaseName(details.uploadedFileName),
        abstract: '',
        methodology: '',
        reviewOfRelatedLiterature: '',
        theoreticalFramework: '',
        resultsAndDiscussion: '',
        keywords: [],
        authors: [],
    };
}

function publicMetadataEntries(
    data: ReportWorkflowData,
): PublicMetadataField[] {
    return data.aiMetadata.selectedPublicMetadata.map((key) => ({
        key: reportKeyToApiKey[key],
        label: metadataFieldLabels[key],
        value: textValue(data.aiMetadata.extractedMetadata, key).trim(),
    }));
}

function selectedPublicApiKeys(data: ReportWorkflowData): MetadataKey[] {
    return data.aiMetadata.selectedPublicMetadata.map(
        (key) => reportKeyToApiKey[key],
    );
}

function nullableNumber(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const numericValue =
        typeof value === 'number' ? value : Number.parseFloat(value);

    return Number.isFinite(numericValue) ? numericValue : null;
}

function nullableString(value: string | null | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
}

function nullableText(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
        return null;
    }

    const trimmed = String(value).trim();

    return trimmed ? trimmed : null;
}

function hydratedReportRowId(item: AgencyResearchPerformanceItem) {
    if (item.id !== undefined) {
        return String(item.id);
    }

    if (item.sort_order !== null && item.sort_order !== undefined) {
        return `performance-item-${item.sort_order}`;
    }

    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `performance-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function reportProjectStatus(value: string | null | undefined) {
    const normalized = value?.replaceAll('_', '-') as
        | ReportProjectStatus
        | undefined;

    return normalized && reportProjectStatuses.includes(normalized)
        ? normalized
        : 'not-reported';
}

function mapReportDetails(
    data: ReportWorkflowData,
): AgencyResearchReportDetail {
    return {
        reporting_period: nullableString(data.details.reportingPeriod),
        project_start_date: nullableString(data.details.projectStartDate),
        project_end_date: nullableString(data.details.projectEndDate),
        allotted_budget: data.financials.allocatedBudget,
        released_amount: data.financials.releasedAmount,
        obligated_amount: data.financials.obligatedAmount,
        utilized_amount: data.financials.usedBudget,
        physical_accomplishment_percent:
            data.performance.physicalAccomplishmentPercent,
        financial_as_of_date: nullableString(data.financials.financialAsOfDate),
        pap_categories: data.papClassification.papCategories,
        pap_description: nullableString(data.papClassification.papDescription),
        beneficiary_sectors: data.papClassification.beneficiarySectors,
        performance_remarks: nullableString(
            data.performance.performanceRemarks,
        ),
        last_wizard_step: nullableString(data.details.lastWizardStep),
    };
}

function mapPerformanceItems(
    data: ReportWorkflowData,
): AgencyResearchPerformanceItem[] {
    return data.performance.performanceProjects
        .filter(hasMeaningfulPerformanceProject)
        .map((project, index) => ({
            project_name: nullableString(project.projectName),
            target_value: project.targetValue,
            actual_value: project.actualValue,
            target_numeric_value: project.targetNumericValue,
            actual_numeric_value: project.actualNumericValue,
            unit: nullableString(project.unit),
            accomplishment_percentage: project.accomplishmentPercentage,
            project_status: project.projectStatus,
            remarks: nullableString(project.remarks),
            sort_order: index,
        }));
}

function hasMeaningfulPerformanceProject(project: {
    projectName: string;
    targetValue: string | null;
    actualValue: string | null;
    targetNumericValue: number | null;
    actualNumericValue: number | null;
    unit: string;
    accomplishmentPercentage: number | null;
    remarks?: string;
}) {
    return Boolean(
        nullableString(project.projectName) ||
        nullableString(project.targetValue ?? '') ||
        nullableString(project.actualValue ?? '') ||
        project.targetNumericValue !== null ||
        project.actualNumericValue !== null ||
        project.accomplishmentPercentage !== null ||
        nullableString(project.remarks),
    );
}

function mapReportHighlights(
    data: ReportWorkflowData,
): AgencyResearchHighlight[] {
    const highlight = data.highlights;

    if (
        !nullableString(highlight.highlightTitle) &&
        !nullableString(highlight.highlightDescription)
    ) {
        return [];
    }

    return [
        {
            id: highlight.highlightId
                ? Number.parseInt(highlight.highlightId, 10)
                : undefined,
            title: nullableString(highlight.highlightTitle),
            description: nullableString(highlight.highlightDescription),
            is_featured: highlight.featuredHighlight,
            sort_order: 0,
        },
    ];
}

export function mapReportWorkflowToResearchPayload(
    data: ReportWorkflowData,
): AgencyResearchPayload {
    const metadata = data.aiMetadata.extractedMetadata;
    const title =
        metadata.title.trim() ||
        data.details.reportTitle.trim() ||
        fileBaseName(data.details.uploadedFileName) ||
        getReportTypeLabel(data.documentType);
    const publicationYear = Number.parseInt(data.details.reportingYear, 10);

    return {
        title,
        abstract:
            metadata.abstract.trim() || data.details.reportDescription || null,
        authors: metadata.authors,
        publication_year: Number.isFinite(publicationYear)
            ? publicationYear
            : new Date().getFullYear(),
        category: getReportTypeLabel(data.documentType),
        sdg_tags: data.sdgTagging.selectedSDGs.map((sdg) => `SDG ${sdg}`),
        keywords: metadata.keywords,
        public_metadata_fields: selectedPublicApiKeys(data),
        public_metadata: publicMetadataEntries(data),
        access_level: 'request_required',
        embargo_until: null,
        external_url: null,
        report_details: mapReportDetails(data),
        performance_items: mapPerformanceItems(data),
        report_highlights: mapReportHighlights(data),
        expected_updated_at: data.details.serverUpdatedAt ?? null,
        expected_draft_version: data.details.serverDraftVersion ?? null,
    };
}

export async function saveReportDraft(data: ReportWorkflowData) {
    const payload = mapReportWorkflowToResearchPayload(data);

    return data.details.researchId
        ? updateAgencyResearchDraft(data.details.researchId, payload)
        : createAgencyResearchDraft(payload);
}

export async function submitReport(data: ReportWorkflowData) {
    const draft = await saveReportDraft(data);

    return submitAgencyResearch(draft.id);
}

export async function uploadReportFile(
    researchId: string | number,
    file: File,
    documentType: ReportDocumentType,
): Promise<ReportFileUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', documentType);
    formData.append('access_level', 'restricted');
    formData.append('visibility', 'private');

    const { data } = await fetchApi<ReportFileRecord>(
        `/api/agency/research/${researchId}/files`,
        {
            method: 'POST',
            body: formData,
        },
    );

    return {
        id: String(data.id),
        researchId: String(data.research_id),
        name: data.original_name,
        size: data.size_bytes,
        type: data.mime_type,
    };
}

export async function runReportMetadataExtraction(
    researchId: string,
    details: ReportDetailsData,
): Promise<ReportAIMetadataResult> {
    const processedResults = await processAgencyAiResults(researchId);
    const results = shouldPollAiStatus(
        aiResultStatus(processedResults.ai_metadata),
    )
        ? await pollAgencyAiResults(researchId, processedResults)
        : processedResults;
    const metadata = results.ai_metadata;
    const status = aiResultStatus(metadata);
    const extractedMetadata = isSuccessfulAiStatus(status)
        ? metadataFromAi(details, metadata)
        : defaultMetadata(details);

    return {
        extractedMetadata,
        selectedPublicMetadata: ['title', 'abstract', 'keywords', 'authors'],
        aiGeneratedFields: reportMetadataKeys,
        analysisMessage: usefulAiMessage(metadata, status),
    };
}

export function mergeReportDetailsWithRecord(
    details: ReportDetailsData,
    record: AgencyResearchRecord,
): ReportDetailsData {
    return {
        ...details,
        researchId: String(record.id),
        reportingPeriod:
            record.report_detail?.reporting_period ?? details.reportingPeriod,
        projectStartDate:
            record.report_detail?.project_start_date ??
            details.projectStartDate,
        projectEndDate:
            record.report_detail?.project_end_date ?? details.projectEndDate,
    };
}

export function reportFinancialsFromRecord(
    record: AgencyResearchRecord,
): Partial<ReportWorkflowData['financials']> {
    const allocatedBudget = nullableNumber(
        record.report_detail?.allotted_budget,
    );
    const releasedAmount = nullableNumber(
        record.report_detail?.released_amount,
    );
    const obligatedAmount = nullableNumber(
        record.report_detail?.obligated_amount,
    );
    const usedBudget = nullableNumber(record.report_detail?.utilized_amount);

    return {
        allocatedBudget,
        releasedAmount,
        obligatedAmount,
        usedBudget,
        financialAsOfDate: record.report_detail?.financial_as_of_date ?? '',
        ...calculateFinancials(allocatedBudget, usedBudget),
    };
}

export function reportPerformanceFromRecord(
    record: AgencyResearchRecord,
): Partial<ReportWorkflowData['performance']> {
    return {
        physicalAccomplishmentPercent: nullableNumber(
            record.report_detail?.physical_accomplishment_percent,
        ),
        performanceProjects: (record.performance_items ?? []).map((item) => {
            return {
                id: hydratedReportRowId(item),
                projectName: item.project_name ?? '',
                targetValue: nullableText(item.target_value),
                actualValue: nullableText(item.actual_value),
                targetNumericValue: nullableNumber(item.target_numeric_value),
                actualNumericValue: nullableNumber(item.actual_numeric_value),
                unit: item.unit ?? '',
                accomplishmentPercentage: nullableNumber(
                    item.accomplishment_percentage,
                ),
                projectStatus: reportProjectStatus(item.project_status),
                remarks: item.remarks ?? '',
            };
        }),
    };
}

export function hydrateReportWorkflowFromRecord(
    record: AgencyResearchRecord,
    agencyName?: string,
): ReportWorkflowData {
    const defaults = createInitialReportWorkflowData('terminal-report');
    const mainFile = record.files?.find(
        (file) =>
            file.file_type === 'terminal-report' &&
            file.status === 'active' &&
            !file.archived_at,
    );
    const publicEntries = new Map(
        (record.public_metadata ?? []).map((entry) => [entry.key, entry.value]),
    );
    const selectedPublicMetadata = (record.public_metadata_fields ?? [])
        .map((key) => apiKeyToReportKey[key])
        .filter((key): key is ReportMetadataKey => Boolean(key));
    const detail = record.report_detail;
    const highlight = record.report_highlights?.[0];
    const selectedSDGs = (record.sdgs ?? [])
        .map((value) => Number.parseInt(value.replace(/\D+/gu, ''), 10))
        .filter(
            (value) => Number.isInteger(value) && value >= 1 && value <= 17,
        );

    return {
        ...defaults,
        details: {
            ...defaults.details,
            researchId: String(record.id),
            uploadedFile: null,
            uploadedFileId: mainFile ? String(mainFile.id) : undefined,
            uploadedFileName: mainFile?.original_name,
            uploadedFileType: mainFile?.mime_type ?? undefined,
            uploadedFileSize: mainFile?.size_bytes,
            uploadStatus: mainFile ? 'uploaded' : 'idle',
            reportTitle: record.title ?? '',
            reportDescription: record.abstract ?? '',
            projectStartDate: detail?.project_start_date ?? '',
            projectEndDate: detail?.project_end_date ?? '',
            reportingPeriod: detail?.reporting_period ?? '',
            reportingYear: record.publication_year
                ? String(record.publication_year)
                : defaults.details.reportingYear,
            agency:
                agencyName ??
                record.agency?.short_name ??
                record.agency?.name ??
                '',
            lastWizardStep: detail?.last_wizard_step ?? null,
            serverUpdatedAt: record.updated_at ?? null,
            serverDraftVersion: detail?.draft_version ?? null,
        },
        aiMetadata: {
            ...defaults.aiMetadata,
            aiAnalysisStarted: selectedPublicMetadata.length > 0,
            aiAnalysisCompleted:
                selectedPublicMetadata.length > 0 &&
                Boolean(record.title?.trim()) &&
                Boolean(record.abstract?.trim()),
            extractionStatus:
                selectedPublicMetadata.length > 0 ? 'success' : 'idle',
            extractedMetadata: {
                title: record.title ?? '',
                abstract: record.abstract ?? '',
                methodology: publicEntries.get('methodology') ?? '',
                reviewOfRelatedLiterature:
                    publicEntries.get('review_of_related_literature') ?? '',
                theoreticalFramework:
                    publicEntries.get('theoretical_framework') ?? '',
                resultsAndDiscussion:
                    publicEntries.get('results_and_discussion') ?? '',
                keywords: record.keywords ?? [],
                authors: Array.isArray(record.authors) ? record.authors : [],
            },
            selectedPublicMetadata,
            metadataValidated: selectedPublicMetadata.length > 0,
        },
        performance: {
            ...defaults.performance,
            ...reportPerformanceFromRecord(record),
            performanceRemarks: detail?.performance_remarks ?? '',
        },
        papClassification: {
            ...defaults.papClassification,
            papCategories: detail?.pap_categories ?? [],
            papDescription: detail?.pap_description ?? '',
            beneficiarySectors: (detail?.beneficiary_sectors ??
                []) as ReportWorkflowData['papClassification']['beneficiarySectors'],
        },
        financials: {
            ...defaults.financials,
            ...reportFinancialsFromRecord(record),
        },
        highlights: {
            ...defaults.highlights,
            highlightId: highlight?.id ? String(highlight.id) : undefined,
            highlightTitle: highlight?.title ?? '',
            highlightDescription: highlight?.description ?? '',
            featuredHighlight: highlight?.is_featured ?? false,
            supportingFiles: (highlight?.files ?? []).map((file) => ({
                id: String(file.id),
                name: file.original_name,
                size: file.size_bytes,
                type: file.mime_type ?? 'application/octet-stream',
            })),
        },
        sdgTagging: {
            ...defaults.sdgTagging,
            selectedSDGs,
            sdgSelectionValidated: selectedSDGs.length > 0,
        },
        review: {
            ...defaults.review,
            draftStatus: 'saved',
            submissionStatus: record.status === 'draft' ? 'draft' : 'submitted',
            submittedAt: record.submitted_at ?? undefined,
        },
    };
}

export async function uploadReportHighlightFile(
    researchId: string | number,
    highlightId: string | number,
    file: File,
) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await fetchApi<AgencyResearchFile>(
        `/api/agency/research/${researchId}/highlights/${highlightId}/files`,
        { method: 'POST', body: formData },
    );

    return {
        id: String(data.id),
        name: data.original_name,
        size: data.size_bytes,
        type: data.mime_type ?? 'application/octet-stream',
    };
}

export async function removeReportFile(
    researchId: string | number,
    fileId: string | number,
) {
    await fetchApi(`/api/agency/research/${researchId}/files/${fileId}`, {
        method: 'DELETE',
    });
}
