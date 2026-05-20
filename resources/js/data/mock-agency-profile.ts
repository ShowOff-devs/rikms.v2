import type { AgencyProfile } from '@/types/agency-profile';

export const mockAgencyProfile: AgencyProfile = {
    id: 'dost-xi',
    name: 'Department of Science and Technology Region XI',
    shortName: 'DOST XI',
    description:
        'The Department of Science and Technology Region XI promotes science, technology, and innovation to support regional development across the Davao Region.',
    website: 'https://region11.dost.gov.ph',
    contactEmail: 'info@dostxi.gov.ph',
    officeAddress:
        'DOST XI Regional Office, Km. 7, J.P. Laurel Ave., Lanang, Davao City, Philippines',
    logoUrl: '/assets/figma/dost-xi-logo.png',
    slug: 'dost-xi',
    researchSummary: {
        totalResearchPublications: 142,
        publishedResearch: 118,
        draftResearch: 24,
    },
    updatedAt: '2026-05-14T00:00:00.000Z',
};
