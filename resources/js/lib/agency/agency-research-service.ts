import { fetchApi } from '@/lib/api-client';
import type {
    AccessType,
    AgencyUploadState,
    MetadataKey,
} from '@/types/agency-upload';
import type {
    RepositoryAccessType,
    RepositoryAuthor,
    RepositoryUpdatePayload,
} from '@/types/repository';

export type AgencyResearchRecord = {
    id: number;
    title: string;
    abstract?: string | null;
    authors: string[] | string;
    publication_year?: number | null;
    category?: string | null;
    sdgs?: string[];
    keywords?: string[];
    public_metadata?: PublicMetadataField[];
    public_metadata_fields?: MetadataKey[];
    status: string;
    access_level?: string | null;
    embargo_until?: string | null;
    external_url?: string | null;
    research_owner_name?: string | null;
    research_owner_email?: string | null;
    notify_owner_access_requests?: boolean;
    notify_owner_research_inquiries?: boolean;
    send_owner_copy_to_admin?: boolean;
    report_detail?: AgencyResearchReportDetail | null;
    performance_items?: AgencyResearchPerformanceItem[];
    report_highlights?: AgencyResearchHighlight[];
    files?: AgencyResearchFile[];
    submitted_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    agency?: {
        name?: string | null;
        short_name?: string | null;
    };
};

export type AgencyResearchReportDetail = {
    id?: number;
    research_id?: number;
    reporting_period?: string | null;
    project_start_date?: string | null;
    project_end_date?: string | null;
    allotted_budget?: string | number | null;
    released_amount?: string | number | null;
    obligated_amount?: string | number | null;
    utilized_amount?: string | number | null;
    physical_accomplishment_percent?: string | number | null;
    financial_as_of_date?: string | null;
    pap_categories?: string[];
    pap_description?: string | null;
    beneficiary_sectors?: string[];
    performance_remarks?: string | null;
    last_wizard_step?: string | null;
    draft_version?: number;
};

export type AgencyResearchPerformanceItem = {
    id?: number;
    research_id?: number;
    project_name?: string | null;
    target_value?: string | number | null;
    actual_value?: string | number | null;
    target_numeric_value?: string | number | null;
    actual_numeric_value?: string | number | null;
    unit?: string | null;
    accomplishment_percentage?: string | number | null;
    project_status?: string | null;
    remarks?: string | null;
    sort_order?: number | null;
};

export type AgencyResearchFile = {
    id: number;
    research_id: number;
    report_highlight_id?: number | null;
    original_name: string;
    mime_type: string | null;
    size_bytes: number;
    file_type: string;
    status: string;
    archived_at?: string | null;
};

export type AgencyResearchHighlight = {
    id?: number;
    research_id?: number;
    title?: string | null;
    description?: string | null;
    is_featured?: boolean;
    sort_order?: number;
    files?: AgencyResearchFile[];
};

export type AgencyResearchPayload = {
    title: string;
    abstract?: string | null;
    authors?: string[];
    publication_year?: number | null;
    category?: string | null;
    sdg_tags?: string[];
    keywords?: string[];
    public_metadata?: PublicMetadataField[];
    public_metadata_fields?: MetadataKey[];
    access_level?: string;
    embargo_until?: string | null;
    external_url?: string | null;
    research_owner_name?: string;
    research_owner_email?: string;
    notify_owner_access_requests?: boolean;
    notify_owner_research_inquiries?: boolean;
    send_owner_copy_to_admin?: boolean;
    report_details?: AgencyResearchReportDetail;
    performance_items?: AgencyResearchPerformanceItem[];
    report_highlights?: AgencyResearchHighlight[];
    expected_updated_at?: string | null;
    expected_draft_version?: number | null;
};

export type PublicMetadataField = {
    key: MetadataKey;
    label: string;
    value: string;
};

export async function createAgencyResearchDraft(
    payload: AgencyResearchPayload,
) {
    const { data } = await fetchApi<AgencyResearchRecord>(
        '/api/agency/research',
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );

    return data;
}

export async function getAgencyResearch(id: string | number) {
    const { data } = await fetchApi<AgencyResearchRecord>(
        `/api/agency/research/${id}`,
    );

    return data;
}

export async function updateAgencyResearchDraft(
    id: string | number,
    payload: AgencyResearchPayload,
) {
    const { data } = await fetchApi<AgencyResearchRecord>(
        `/api/agency/research/${id}`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );

    return data;
}

export async function submitAgencyResearch(
    id: string | number,
    notes?: string,
) {
    const { data } = await fetchApi<AgencyResearchRecord>(
        `/api/agency/research/${id}/submit`,
        {
            method: 'POST',
            body: JSON.stringify({ notes }),
        },
    );

    return data;
}

export async function saveAgencyResearchDraft(
    state: AgencyUploadState,
    id?: string | number | null,
) {
    const payload = mapUploadStateToResearchPayload(state);

    return id
        ? updateAgencyResearchDraft(id, payload)
        : createAgencyResearchDraft(payload);
}

export function mapUploadStateToResearchPayload(
    state: AgencyUploadState,
): AgencyResearchPayload {
    const metadata = Object.fromEntries(
        state.metadata.map((field) => [field.key, field.value.trim()]),
    ) as Record<string, string | undefined>;
    const title =
        metadata.title ||
        state.manualTitle.trim() ||
        state.file?.name.replace(/\.[^.]+$/u, '') ||
        'Untitled Research';
    const keywords =
        metadata.keywords
            ?.split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean) ?? [];
    const authors =
        metadata.authors
            ?.split(',')
            .map((author) => author.trim())
            .filter(Boolean) ?? [];

    return {
        title,
        abstract: metadata.abstract || null,
        authors,
        publication_year: new Date().getFullYear(),
        category: state.researchCategory || 'Uncategorized',
        sdg_tags: state.selectedSdgs.map((sdg) => `SDG ${sdg}`),
        keywords,
        public_metadata_fields: state.metadata
            .filter((field) => field.isPublic)
            .map((field) => field.key),
        public_metadata: state.metadata
            .filter((field) => field.isPublic)
            .map((field) => ({
                key: field.key,
                label: field.label,
                value: field.value.trim(),
            })),
        access_level: mapAccessTypeToApi(state.accessType),
        embargo_until:
            state.accessType === 'embargo' ? state.embargoDate : null,
        external_url:
            state.accessType === 'external-link'
                ? state.externalUrl.trim()
                : null,
        research_owner_name: state.researchOwnerName.trim(),
        research_owner_email: state.researchOwnerEmail.trim().toLowerCase(),
        notify_owner_access_requests: state.notifyAccessRequests,
        notify_owner_research_inquiries: state.notifyResearchInquiries,
        send_owner_copy_to_admin: state.sendCopyToAdmin,
    };
}

export function mapRepositoryPayloadToResearchPayload(
    payload: RepositoryUpdatePayload,
): AgencyResearchPayload {
    return {
        title: payload.title,
        abstract: payload.abstract,
        authors: payload.authors.map(formatRepositoryAuthor).filter(Boolean),
        publication_year: payload.year,
        category: payload.category,
        sdg_tags: payload.sdgs,
        keywords: payload.keywords,
        access_level: mapRepositoryAccessTypeToApi(payload.accessType),
        embargo_until:
            payload.accessType === 'embargo' ? payload.embargoUntil : null,
        external_url:
            payload.accessType === 'external-link'
                ? payload.externalLink
                : null,
    };
}

function formatRepositoryAuthor(author: RepositoryAuthor) {
    return author.email ? `${author.name} <${author.email}>` : author.name;
}

function mapAccessTypeToApi(accessType: AccessType) {
    if (accessType === 'request') {
        return 'request_required';
    }

    if (accessType === 'embargo') {
        return 'embargoed';
    }

    if (accessType === 'external-link') {
        return 'restricted';
    }

    return accessType;
}

function mapRepositoryAccessTypeToApi(accessType: RepositoryAccessType) {
    if (accessType === 'request-access') {
        return 'request_required';
    }

    if (accessType === 'embargo') {
        return 'embargoed';
    }

    if (accessType === 'external-link') {
        return 'restricted';
    }

    return accessType;
}
