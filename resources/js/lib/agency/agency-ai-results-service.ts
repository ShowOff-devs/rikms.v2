import { fetchApi } from '@/lib/api-client';

export type AgencyAiResultSection = {
    result_type: string;
    status: string;
    review_status?: string | null;
    processing_status?: string | null;
    confidence_score?: number | null;
    extracted_title?: string | null;
    extracted_authors?: string[];
    extracted_keywords?: string[];
    extracted_abstract?: string | null;
    extracted_methodology?: string | null;
    extracted_review_of_related_literature?: string | null;
    extracted_theoretical_framework?: string | null;
    extracted_results_and_discussion?: string | null;
    publication_year?: number | string | null;
    research_category?: string | null;
    suggested_sdg_tags?: Array<
        | string
        | {
              sdg?: string;
              label?: string;
              confidence_score?: number;
              reason?: string;
          }
    >;
    primary_sdg?: {
        sdg?: string;
        label?: string;
        confidence_score?: number;
        reason?: string;
    } | null;
    evidence_keywords?: string[];
    page_count?: number | null;
    text_length?: number | null;
    generated_at?: string | null;
    message?: string;
    processing_errors?: string[];
};

export type AgencyAiResults = {
    research_id: number;
    agency_id: number;
    status: string;
    pdf_parsing_result: AgencyAiResultSection;
    ai_metadata: AgencyAiResultSection;
    sdg_classification: AgencyAiResultSection;
};

export async function getAgencyAiResults(researchId: string) {
    const { data } = await fetchApi<AgencyAiResults>(
        `/api/agency/research/${researchId}/ai-results`,
    );

    return data;
}

export async function processAgencyAiResults(researchId: string) {
    const { data } = await fetchApi<AgencyAiResults>(
        `/api/agency/research/${researchId}/ai-results/process`,
        {
            method: 'POST',
        },
    );

    return data;
}
