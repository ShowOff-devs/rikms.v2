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
    PublicMetadataField,
} from '@/lib/agency/agency-research-service';
import { fetchApi } from '@/lib/api-client';
import {
    getReportTypeLabel,
    metadataFieldLabels,
} from '@/lib/upload/report-workflow';
import type { MetadataKey } from '@/types/agency-upload';
import type {
    ReportAIMetadataFields,
    ReportDetailsData,
    ReportDocumentType,
    ReportMetadataKey,
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

function textValue(
    metadata: ReportAIMetadataFields,
    key: ReportMetadataKey,
) {
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
        title: details.reportTitle.trim() || fileBaseName(details.uploadedFileName),
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
    };
}
