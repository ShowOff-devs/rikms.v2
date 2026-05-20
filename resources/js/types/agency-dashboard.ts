export type AgencyResearchStatus = 'published' | 'draft' | 'archived';

export type AgencyResearchRecord = {
    id: string;
    repositoryId?: string;
    title: string;
    authors: string;
    year: number;
    category: string;
    status: AgencyResearchStatus;
    lastUpdated: string;
};

export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export type AgencyAccessRequest = {
    id: string;
    requesterName: string;
    organization: string;
    researchTitle: string;
    requestDate: string;
    status: AccessRequestStatus;
};

export type DashboardMetric = {
    id: string;
    label: string;
    value: number;
    tone: 'blue' | 'amber' | 'green' | 'slate';
};

export type ResearchYearPoint = {
    year: number;
    count: number;
};

export type ResearchCategoryPoint = {
    category: string;
    count: number;
    color: string;
};
