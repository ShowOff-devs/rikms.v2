import { fetchApi } from '@/lib/api-client';
import type { AccessType, AgencyUploadState } from '@/types/agency-upload';
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
    status: string;
    access_level?: string | null;
    embargo_until?: string | null;
    external_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type AgencyResearchPayload = {
    title: string;
    abstract?: string | null;
    authors?: string[];
    publication_year?: number | null;
    category?: string | null;
    sdg_tags?: string[];
    keywords?: string[];
    access_level?: string;
    embargo_until?: string | null;
    external_url?: string | null;
};

export async function createAgencyResearchDraft(payload: AgencyResearchPayload) {
    const { data } = await fetchApi<AgencyResearchRecord>('/api/agency/research', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

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
        category: 'Uncategorized',
        sdg_tags: state.selectedSdgs.map((sdg) => `SDG ${sdg}`),
        keywords,
        access_level: mapAccessTypeToApi(state.accessType),
        embargo_until: state.accessType === 'embargo' ? state.embargoDate : null,
        external_url:
            state.accessType === 'external-link'
                ? state.externalUrl.trim()
                : null,
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
