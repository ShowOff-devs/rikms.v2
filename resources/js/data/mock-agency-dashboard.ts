import type {
    AgencyAccessRequest,
    AgencyResearchRecord,
    DashboardMetric,
    ResearchCategoryPoint,
    ResearchYearPoint,
} from '@/types/agency-dashboard';

export const dashboardMetrics: DashboardMetric[] = [
    { id: 'total', label: 'Total Research Studies', value: 142, tone: 'blue' },
    { id: 'draft', label: 'Draft Research', value: 18, tone: 'amber' },
    { id: 'published', label: 'Published Research', value: 120, tone: 'green' },
    { id: 'archived', label: 'Archived Research', value: 4, tone: 'slate' },
];

export const researchByYear: ResearchYearPoint[] = [
    { year: 2020, count: 12 },
    { year: 2021, count: 18 },
    { year: 2022, count: 24 },
    { year: 2023, count: 31 },
    { year: 2024, count: 36 },
    { year: 2025, count: 22 },
];

export const researchByCategory: ResearchCategoryPoint[] = [
    { category: 'Environmental Science', count: 34, color: '#1e3a8a' },
    { category: 'Public Health', count: 25, color: '#4c9f38' },
    { category: 'Education', count: 22, color: '#c5192d' },
    { category: 'Technology', count: 28, color: '#fd6925' },
    { category: 'Agriculture', count: 19, color: '#dda63a' },
    { category: 'Social Sciences', count: 14, color: '#0a97d9' },
];

export const agencyResearchRecords: AgencyResearchRecord[] = [
    {
        id: 'climate-coastal-communities',
        title: 'Impact of Climate Change on Coastal Communities',
        authors: 'Dr. Maria Santos, Dr. Juan Dela Cruz',
        year: 2025,
        category: 'Environmental Science',
        status: 'published',
        lastUpdated: '2025-02-28',
    },
    {
        id: 'iot-environmental-monitoring',
        title: 'IoT-Based Environmental Monitoring System',
        authors: 'Eng. Sofia Reyes, Dr. Marco Villanueva',
        year: 2025,
        category: 'Technology',
        status: 'published',
        lastUpdated: '2025-02-25',
    },
    {
        id: 'ai-water-quality',
        repositoryId: 'rr-002',
        title: 'AI-Assisted Water Quality Assessment Framework',
        authors: 'Dr. Elena Torres, Dr. Rafael Domingo',
        year: 2025,
        category: 'Technology',
        status: 'draft',
        lastUpdated: '2025-03-01',
    },
    {
        id: 'indigenous-knowledge-systems',
        title: 'Indigenous Knowledge Systems in Disaster Preparedness',
        authors: 'Prof. Ana Reyes, Dr. Carlos Lim',
        year: 2024,
        category: 'Social Sciences',
        status: 'published',
        lastUpdated: '2024-12-15',
    },
    {
        id: 'renewable-microgrids',
        repositoryId: 'rr-001',
        title: 'Renewable Energy Microgrids for Off-Grid Barangays',
        authors: 'Eng. Miguel Ramos',
        year: 2025,
        category: 'Technology',
        status: 'draft',
        lastUpdated: '2025-03-03',
    },
];

export const agencyAccessRequests: AgencyAccessRequest[] = [
    {
        id: 'request-ana-mercado',
        requesterName: 'Dr. Ana Lourdes Mercado',
        organization: 'Ateneo de Davao University',
        researchTitle: 'Impact of Climate Change on Coastal Communities',
        requestDate: '2025-03-04',
        status: 'pending',
    },
    {
        id: 'request-james-chua',
        requesterName: 'Prof. James Chua',
        organization: 'University of Mindanao',
        researchTitle: 'IoT-Based Environmental Monitoring System',
        requestDate: '2025-03-03',
        status: 'pending',
    },
    {
        id: 'request-patricia-navarro',
        requesterName: 'Engr. Patricia Navarro',
        organization: 'DOST - PCIEERD',
        researchTitle: 'AI-Assisted Water Quality Assessment Framework',
        requestDate: '2025-03-02',
        status: 'pending',
    },
];
