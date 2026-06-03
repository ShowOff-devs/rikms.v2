import type {
    SystemResearchAccessType,
    SystemResearchDocumentType,
    SystemResearchStatus,
} from '@/types/system-research';

export const systemResearchStatusLabels: Record<SystemResearchStatus, string> =
    {
        published: 'Published',
        'under-review': 'Under Review',
        draft: 'Draft',
        archived: 'Archived',
    };

export const systemResearchDocumentTypeLabels: Record<
    SystemResearchDocumentType,
    string
> = {
    'research-study': 'Research Study',
    'terminal-report': 'Terminal Report',
    'project-accomplishment': 'Project Accomplishment',
};

export const systemResearchAccessTypeLabels: Record<
    SystemResearchAccessType,
    string
> = {
    public: 'Public',
    restricted: 'Restricted',
    'request-access': 'Request Access',
    embargo: 'Embargo',
    'external-link': 'External Link',
};
