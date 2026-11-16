import type { AgencyResearchRecord } from '@/lib/agency/agency-research-service';
import type { RepositoryItem } from '@/types/repository';

export type RepositoryViewContentProps = {
    item: RepositoryItem;
    record: AgencyResearchRecord | null;
};
