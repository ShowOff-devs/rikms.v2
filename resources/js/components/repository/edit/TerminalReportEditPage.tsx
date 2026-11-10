import type { DocumentEditPageProps } from '@/components/repository/edit/document-edit-page';
import { ReportEditPage } from '@/components/repository/edit/reports/ReportEditPage';

export function TerminalReportEditPage(props: DocumentEditPageProps) {
    return (
        <ReportEditPage
            {...props}
            documentType="terminal-report"
            documentLabel="Terminal Report"
            breadcrumbLabel="Terminal Reports"
        />
    );
}
