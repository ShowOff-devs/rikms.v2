import type {
    RepositoryAccessType,
    RepositoryDocumentType,
    RepositoryStatus,
} from '@/types/repository';

export const repositoryDocumentTypeLabels: Record<
    RepositoryDocumentType,
    string
> = {
    'research-study': 'Research Study',
    'terminal-report': 'Terminal Report',
    'project-accomplishment': 'Project Accomplishment Report',
};

export const repositoryStatusLabels: Record<RepositoryStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    pending: 'Pending',
    restricted: 'Restricted',
    archived: 'Archived',
};

export const repositoryAccessTypeLabels: Record<RepositoryAccessType, string> =
    {
        public: 'Public',
        restricted: 'Access Restricted',
        'request-access': 'Request Access',
        embargo: 'Embargoed',
        'external-link': 'External Link',
    };

export const repositoryDocumentTypeColors: Record<
    RepositoryDocumentType,
    string
> = {
    'research-study': '#1e3a8a',
    'terminal-report': '#7c3aed',
    'project-accomplishment': '#059669',
};

export const repositoryCategoryColors: Record<string, string> = {
    'Circular Economy': '#1e3a8a',
    'Digital Economy': '#7c3aed',
    'Disaster Resilience': '#059669',
    'Food Security': '#e11d48',
    'Health Systems': '#0891b2',
    'Public Governance': '#ca8a04',
    'Sustainable Energy': '#f97316',
    'Water Resources': '#2563eb',
};

export const repositorySdgColors: Record<string, string> = {
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
