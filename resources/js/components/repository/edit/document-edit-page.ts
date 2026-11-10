import type { RepositoryItem } from '@/types/repository';

export type DocumentEditPageProps = {
    repositoryId: string;
    initialItem: RepositoryItem;
};

export type EditDocumentErrors = Partial<
    Record<
        | 'title'
        | 'authors'
        | 'category'
        | 'sdgs'
        | 'year'
        | 'accessType'
        | 'externalLink'
        | 'embargoUntil',
        string
    >
> & {
    authorEmails?: Record<number, string>;
};
