import { ReportDocumentView } from './ReportDocumentView';
import type { RepositoryViewContentProps } from './repository-view-content';

export function TerminalReportView(props: RepositoryViewContentProps) {
    return (
        <ReportDocumentView {...props} summaryLabel="Terminal Report Summary" />
    );
}
