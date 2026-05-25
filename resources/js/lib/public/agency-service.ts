import { mockPublicAgencies } from '@/data/mock-public-agencies';
import { mockResearchRecords } from '@/data/mock-research';
import type { PublicAgency, PublicAgencyKind } from '@/types/public-agency';
import type { ResearchRecord } from '@/types/research';

export type AgencyDirectoryQuery = {
    search: string;
    type: PublicAgencyKind | 'all';
};

export function getPublicAgencies(): PublicAgency[] {
    return mockPublicAgencies;
}

export function findPublicAgency(slug: string): PublicAgency | null {
    return (
        mockPublicAgencies.find((agency) => agency.slug === slug) ?? null
    );
}

export function searchPublicAgencies(query: AgencyDirectoryQuery) {
    const normalizedSearch = query.search.trim().toLowerCase();

    return mockPublicAgencies.filter((agency) => {
        const matchesType = query.type === 'all' || agency.type === query.type;
        const matchesSearch =
            !normalizedSearch ||
            [
                agency.name,
                agency.fullName,
                agency.description,
                agency.type,
            ]
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch);

        return matchesType && matchesSearch;
    });
}

export function getPublicAgencyTypes() {
    return Array.from(new Set(mockPublicAgencies.map((agency) => agency.type)));
}

export function getResearchForAgency(agencyName: string): ResearchRecord[] {
    return mockResearchRecords.filter((record) => record.agency === agencyName);
}
