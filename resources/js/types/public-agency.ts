export type PublicAgencyKind =
    | 'Government Agency'
    | 'Research Consortium'
    | 'Higher Education Institution';

export type PublicAgency = {
    id: number;
    slug: string;
    name: string;
    fullName: string;
    short_name?: string | null;
    logo_url: string | null;
    description: string;
    type: PublicAgencyKind;
    publications: number;
    website: string;
    contactEmail: string;
    address: string;
};
