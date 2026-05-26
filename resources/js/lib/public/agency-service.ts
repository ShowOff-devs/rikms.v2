import type { PublicAgency, PublicAgencyKind } from '@/types/public-agency';
import type { ResearchRecord } from '@/types/research';

export type AgencyDirectoryQuery = {
    search: string;
    type: PublicAgencyKind | 'all';
};

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Unable to load agency records. Please try again.');
    }

    return response.json() as Promise<T>;
}

export async function getPublicAgencies(): Promise<PublicAgency[]> {
    const response = await fetchJson<{ data: PublicAgency[] }>(
        '/api/public/agencies',
    );

    return response.data;
}

export async function findPublicAgency(
    slug: string,
): Promise<PublicAgency | null> {
    try {
        const response = await fetchJson<{ data: PublicAgency }>(
            `/api/public/agencies/${encodeURIComponent(slug)}`,
        );

        return response.data;
    } catch {
        return null;
    }
}

export async function searchPublicAgencies(
    query: AgencyDirectoryQuery,
): Promise<PublicAgency[]> {
    const params = new URLSearchParams();

    if (query.search.trim()) {
        params.set('search', query.search.trim());
    }

    if (query.type !== 'all') {
        params.set('type', query.type);
    }

    const response = await fetchJson<{ data: PublicAgency[] }>(
        `/api/public/agencies?${params.toString()}`,
    );

    return response.data;
}

export async function getPublicAgencyTypes(): Promise<PublicAgencyKind[]> {
    const response = await fetchJson<{ data: PublicAgencyKind[] }>(
        '/api/public/agencies/types',
    );

    return response.data;
}

export async function getResearchForAgency(
    agencySlug: string,
): Promise<ResearchRecord[]> {
    const response = await fetchJson<{ data: ResearchRecord[] }>(
        `/api/public/agencies/${encodeURIComponent(agencySlug)}/research`,
    );

    return response.data;
}
