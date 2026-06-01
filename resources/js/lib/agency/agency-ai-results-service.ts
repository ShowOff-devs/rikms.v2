import { fetchApi } from '@/lib/api-client';

export type AgencyAiResultSection = {
    result_type: string;
    status: string;
    confidence_score?: number | null;
    extracted_title?: string | null;
    extracted_authors?: string[];
    extracted_keywords?: string[];
    extracted_abstract?: string | null;
    suggested_sdg_tags?: Array<string | { sdg?: string; label?: string }>;
    page_count?: number | null;
    generated_at?: string | null;
    message?: string;
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
