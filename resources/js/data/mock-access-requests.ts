import type { AccessRequest } from '@/types/access-request';

export const mockAccessRequests: AccessRequest[] = [
    {
        id: 'arq-001',
        requesterName: 'Engr. Mark Santos',
        requesterEmail: 'msantos@dict.gov.ph',
        organization: 'DICT Region XI',
        researchTitle: 'Geospatial Analysis for Regional Development Planning',
        researchId: 'res-geo-2025-001',
        requestDate: 'Mar 5, 2025',
        status: 'pending',
        requestMessage:
            'Requesting access for regional infrastructure planning and geospatial validation work.',
    },
    {
        id: 'arq-002',
        requesterName: 'Dr. Ana Lourdes Mercado',
        requesterEmail: 'almercado@addu.edu.ph',
        organization: 'Ateneo de Davao University',
        researchTitle:
            'Impact of Climate Change on Coastal Communities in the Davao Gulf',
        researchId: 'res-climate-2025-014',
        requestDate: 'Mar 4, 2025',
        status: 'pending',
        requestMessage:
            'I need the full document for a comparative study on coastal adaptation strategies.',
    },
    {
        id: 'arq-003',
        requesterName: 'Prof. James Chua',
        requesterEmail: 'jchua@umindanao.edu.ph',
        organization: 'University of Mindanao',
        researchTitle: 'IoT-Based Environmental Monitoring for Smart Cities',
        researchId: 'res-iot-2025-022',
        requestDate: 'Mar 3, 2025',
        status: 'pending',
        requestMessage:
            'Access will support a graduate research seminar on city-scale sensor deployments.',
    },
    {
        id: 'arq-004',
        requesterName: 'Engr. Patricia Navarro',
        requesterEmail: 'pnavarro@dost.gov.ph',
        organization: 'DOST - PCIEERD',
        researchTitle: 'AI-Assisted Water Quality Assessment in Davao River',
        researchId: 'res-water-2025-006',
        requestDate: 'Mar 2, 2025',
        status: 'pending',
        requestMessage:
            'Requesting access for technical review and possible program alignment.',
    },
    {
        id: 'arq-005',
        requesterName: 'Dr. Maria Elena Torres',
        requesterEmail: 'metorres@dlsu.edu.ph',
        organization: 'De La Salle University',
        researchTitle:
            'Digital Literacy Programs and Their Impact on Rural Education',
        researchId: 'res-education-2025-009',
        requestDate: 'Mar 1, 2025',
        status: 'pending',
        requestMessage:
            'The document will be used to benchmark learning intervention outcomes.',
    },
    {
        id: 'arq-006',
        requesterName: 'Ms. Camille Dizon',
        requesterEmail: 'cdizon@ched.gov.ph',
        organization: 'CHED Region XI',
        researchTitle: 'Higher Education Research Capacity in Davao Region',
        researchId: 'res-highered-2025-017',
        requestDate: 'Mar 1, 2025',
        status: 'pending',
        requestMessage:
            'Access is needed for agency coordination on research capability development.',
    },
    {
        id: 'arq-007',
        requesterName: 'Dr. Roberto Garcia',
        requesterEmail: 'rgarcia@usep.edu.ph',
        organization: 'University of Southeastern Philippines',
        researchTitle:
            'Renewable Energy Microgrids for Off-Grid Barangays in Southern Mindanao',
        researchId: 'res-energy-2025-003',
        requestDate: 'Feb 28, 2025',
        status: 'approved',
        requestMessage:
            'Requesting access for renewable-energy curriculum development.',
        processedAt: 'Mar 1, 2025',
        processedBy: 'Agency Admin',
    },
    {
        id: 'arq-008',
        requesterName: 'Ms. Sarah Lim',
        requesterEmail: 'sarahlim@gmail.com',
        organization: 'Independent Researcher',
        researchTitle:
            'Indigenous Knowledge Systems in Disaster Risk Reduction',
        researchId: 'res-drr-2025-011',
        requestDate: 'Feb 25, 2025',
        status: 'denied',
        requestMessage:
            'I am compiling community resilience references for an independent paper.',
        denialReason: 'Requester affiliation could not be verified.',
        processedAt: 'Feb 26, 2025',
        processedBy: 'Agency Admin',
    },
    {
        id: 'arq-009',
        requesterName: 'Dr. Fernando Aquino',
        requesterEmail: 'faquino@rhrdc.org',
        organization: 'RHRDC XI',
        researchTitle:
            'Impact of Climate Change on Coastal Communities in the Davao Gulf',
        researchId: 'res-climate-2025-014',
        requestDate: 'Feb 20, 2025',
        status: 'approved',
        requestMessage:
            'Access will support regional health risk assessment research.',
        processedAt: 'Feb 21, 2025',
        processedBy: 'Agency Admin',
    },
    {
        id: 'arq-010',
        requesterName: 'Mr. Kevin Ramos',
        requesterEmail: 'kramos@neda.gov.ph',
        organization: 'NEDA Region XI',
        researchTitle:
            'Sustainable Agriculture Practices for Smallholder Farmers in Southern Mindanao',
        researchId: 'res-agri-2025-002',
        requestDate: 'Feb 18, 2025',
        status: 'approved',
        requestMessage:
            'The research will be referenced for regional development planning inputs.',
        processedAt: 'Feb 19, 2025',
        processedBy: 'Agency Admin',
    },
    {
        id: 'arq-011',
        requesterName: 'Prof. Linda Pascual',
        requesterEmail: 'lpascual@up.edu.ph',
        organization: 'University of the Philippines Mindanao',
        researchTitle:
            'Community-Based Tuberculosis Prevention in Urban Poor Areas of Davao City',
        researchId: 'res-health-2025-005',
        requestDate: 'Feb 15, 2025',
        status: 'approved',
        requestMessage:
            'Access requested for a public health methods class and citation review.',
        processedAt: 'Feb 16, 2025',
        processedBy: 'Agency Admin',
    },
    {
        id: 'arq-012',
        requesterName: 'Mr. Adrian Mendoza',
        requesterEmail: 'amendoza@consultant.example',
        organization: 'Private Consultant',
        researchTitle: 'Urban Flood Modeling for Davao City Watersheds',
        researchId: 'res-flood-2025-018',
        requestDate: 'Feb 12, 2025',
        status: 'denied',
        requestMessage:
            'Requesting access for a private-sector feasibility engagement.',
        denialReason: 'The requested use is outside the approved agency scope.',
        processedAt: 'Feb 13, 2025',
        processedBy: 'Agency Admin',
    },
];
