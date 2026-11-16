import { ReportDocumentView } from './ReportDocumentView';
import type { RepositoryViewContentProps } from './repository-view-content';

export function ProjectAccomplishmentView(props: RepositoryViewContentProps) {
    return (
        <ReportDocumentView
            {...props}
            summaryLabel="Project Accomplishment Summary"
        />
    );
}
