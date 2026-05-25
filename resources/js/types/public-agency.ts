export type PublicAgencyKind =
    | 'Government Agency'
    | 'Research Consortium'
    | 'Higher Education Institution';

export type PublicAgency = {
    slug: string;
    name: string;
    fullName: string;
    description: string;
    type: PublicAgencyKind;
    publications: number;
    website: string;
    contactEmail: string;
    address: string;
};
