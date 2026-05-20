import { Head, usePage } from '@inertiajs/react';
import { EditDocumentPage } from '@/components/repository/edit/EditDocumentPage';

export default function AgencyResearchRepositoryEditPage() {
    const { repositoryId } = usePage<{ repositoryId: string }>().props;

    return (
        <>
            <Head title="Edit Document" />
            <EditDocumentPage repositoryId={repositoryId} />
        </>
    );
}
