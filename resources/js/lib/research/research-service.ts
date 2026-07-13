import { fetchApi } from '@/lib/api-client';
import type {
    ResearchFacetOptions,
    ResearchFilterOption,
    ResearchQuery,
    ResearchRecord,
    ResearchSearchResult,
} from '@/types/research';

export const sdgColors: Record<string, string> = {
    'SDG 1': '#e5243b',
    'SDG 2': '#dda63a',
    'SDG 3': '#4c9f38',
    'SDG 4': '#c5192d',
    'SDG 5': '#ff3a21',
    'SDG 6': '#26bde2',
    'SDG 7': '#fcc30b',
    'SDG 8': '#a21942',
    'SDG 9': '#fd6925',
    'SDG 10': '#dd1367',
    'SDG 11': '#fd9d24',
    'SDG 12': '#bf8b2e',
    'SDG 13': '#3f7e44',
    'SDG 14': '#0a97d9',
    'SDG 15': '#56c02b',
    'SDG 16': '#00689d',
    'SDG 17': '#19486a',
};

export type PublicPortalSummary = {
    researchCount: number;
    agencyCount: number;
    latestPublicationCount: number;
    latestPublicationYear: number | null;
    recentPublicationCount: number;
    representedSdgCount: number;
    sdgCards: Array<{
        number: string;
        label: string;
        color: string;
        count: number;
    }>;
    featuredResearch: ResearchRecord[];
};

const defaultFacetOption = (value: string): ResearchFilterOption => ({
    label: value,
    value,
    count: 0,
    color: sdgColors[value],
});

export function getResearchFacets(): ResearchFacetOptions {
    return {
        agencies: [],
        categories: [],
        sdgs: Array.from({ length: 17 }, (_, index) =>
            defaultFacetOption(`SDG ${index + 1}`),
        ),
        years: [],
        accessLevels: ['public', 'restricted', 'embargo', 'external'].map(
            defaultFacetOption,
        ),
        statuses: ['published'].map(defaultFacetOption),
        minYear: 1900,
        maxYear: new Date().getFullYear() + 1,
    };
}

const appendArrayParam = (
    params: URLSearchParams,
    key: string,
    values: Array<string | number>,
) => {
    if (values.length > 0) {
        params.set(key, values.join(','));
    }
};

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Unable to load research records. Please try again.');
    }

    return response.json() as Promise<T>;
}

export async function searchResearch(
    query: ResearchQuery,
): Promise<ResearchSearchResult> {
    const params = new URLSearchParams();

    if (query.search.trim()) {
        params.set('search', query.search.trim());
    }

    appendArrayParam(params, 'agency', query.agencies);
    appendArrayParam(params, 'category', query.categories);
    appendArrayParam(params, 'sdg', query.sdgs);
    appendArrayParam(params, 'year', query.years);
    appendArrayParam(params, 'access', query.accessLevels);
    appendArrayParam(params, 'status', query.statuses);
    params.set('from', String(query.yearFrom));
    params.set('to', String(query.yearTo));
    params.set('sort', query.sort);
    params.set('page', String(query.page));
    params.set('per_page', String(query.perPage));

    return fetchJson<ResearchSearchResult>(
        `/api/public/research?${params.toString()}`,
    );
}

export async function getResearchRecord(
    id: string,
): Promise<ResearchRecord | null> {
    try {
        const response = await fetchJson<{ data: ResearchRecord }>(
            `/api/public/research/${encodeURIComponent(id)}`,
        );

        return response.data;
    } catch {
        return null;
    }
}

export async function downloadPublicResearchFile(
    researchId: string,
    fallbackFileName: string,
) {
    const response = await fetch(
        `/api/public/research/${encodeURIComponent(researchId)}/download`,
        {
            headers: {
                Accept: 'application/pdf,application/octet-stream',
            },
        },
    );

    if (!response.ok) {
        throw new Error(await downloadErrorMessage(response));
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
        downloadFileName(response) ?? `${fallbackFileName || 'research'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export async function getPublicPortalSummary(): Promise<PublicPortalSummary> {
    return fetchJson<PublicPortalSummary>('/api/public/summary');
}

export async function getPublicPlatformSettings(): Promise<{
    accessRequestsEnabled: boolean;
}> {
    const response = await fetchJson<{
        data: { access_requests_enabled?: boolean };
    }>('/api/public/platform-settings');

    return {
        accessRequestsEnabled: response.data.access_requests_enabled !== false,
    };
}

export type PublicAccessRequestPayload = {
    requester_name: string;
    requester_email: string;
    requester_affiliation?: string;
    requester_purpose: string;
    message?: string;
    intended_use?: string;
    website?: string;
    captcha_token?: string;
};

export async function submitPublicAccessRequest(
    researchId: string,
    payload: PublicAccessRequestPayload,
) {
    return fetchApi(
        `/api/public/research/${encodeURIComponent(researchId)}/access-requests`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );
}

async function downloadErrorMessage(response: Response) {
    try {
        const payload = (await response.json()) as { message?: string };

        return payload.message ?? 'Unable to download this research file.';
    } catch {
        return 'Unable to download this research file.';
    }
}

function downloadFileName(response: Response) {
    const disposition = response.headers.get('content-disposition');

    if (!disposition) {
        return null;
    }

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);

    return asciiMatch?.[1] ?? null;
}
