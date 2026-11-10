import type { DocumentEditPageProps } from '@/components/repository/edit/document-edit-page';
import { LegacyDocumentEditPage } from '@/components/repository/edit/LegacyDocumentEditPage';

export function ResearchStudyEditPage(props: DocumentEditPageProps) {
    return <LegacyDocumentEditPage {...props} />;
}
