import type { DocumentEditPageProps } from '@/components/repository/edit/document-edit-page';
import { ReportEditPage } from '@/components/repository/edit/reports/ReportEditPage';

export function ProjectAccomplishmentEditPage(props: DocumentEditPageProps) {
    return (
        <ReportEditPage
            {...props}
            documentType="project-accomplishment"
            documentLabel="Project Accomplishment Report"
            breadcrumbLabel="Project Accomplishment Reports"
            allowMultipleHighlights
        />
    );
}
