import type {
    ArchiveActivityType,
    ArchivedResearchDocumentType,
} from '@/types/archive';

export const archiveDocumentTypeLabels: Record<
    ArchivedResearchDocumentType,
    string
> = {
    'research-study': 'Research Study',
    'terminal-report': 'Terminal Report',
    'project-accomplishment': 'Project Accomplishment',
};

export const archiveActivityLabels: Record<ArchiveActivityType, string> = {
    'research-archived': 'Research archived',
    'research-restored': 'Research restored',
    'research-permanently-deleted': 'Research permanently deleted',
};
