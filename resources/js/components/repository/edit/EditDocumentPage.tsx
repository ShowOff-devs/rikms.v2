import { router } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { ProjectAccomplishmentEditPage } from '@/components/repository/edit/ProjectAccomplishmentEditPage';
import { ResearchStudyEditPage } from '@/components/repository/edit/ResearchStudyEditPage';
import { TerminalReportEditPage } from '@/components/repository/edit/TerminalReportEditPage';
import { useAgencySession } from '@/lib/auth/agency-auth';
import { getRepositoryItemById } from '@/lib/repository/repository-service';
import type {
    RepositoryDocumentType,
    RepositoryItem,
} from '@/types/repository';

type EditDocumentPageProps = {
    repositoryId: string;
};

type RepositoryLoadState =
    | { repositoryId: string; status: 'loading' }
    | { repositoryId: string; status: 'loaded'; item: RepositoryItem }
    | { repositoryId: string; status: 'error'; message: string };

export function editPageKeyForDocumentType(
    documentType: RepositoryDocumentType,
): RepositoryDocumentType {
    if (documentType === 'terminal-report') {
        return 'terminal-report';
    }

    if (documentType === 'project-accomplishment') {
        return 'project-accomplishment';
    }

    return 'research-study';
}

export function EditDocumentPage({ repositoryId }: EditDocumentPageProps) {
    const session = useAgencySession();
    const [search, setSearch] = useState('');
    const [loadState, setLoadState] = useState<RepositoryLoadState>({
        repositoryId,
        status: 'loading',
    });

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        let isCurrent = true;

        getRepositoryItemById(repositoryId)
            .then((record) => {
                if (!isCurrent) {
                    return;
                }

                if (record) {
                    setLoadState({
                        repositoryId,
                        status: 'loaded',
                        item: record,
                    });

                    return;
                }

                setLoadState({
                    repositoryId,
                    status: 'error',
                    message:
                        'The selected repository record does not exist in your agency repository.',
                });
            })
            .catch((error: unknown) => {
                if (!isCurrent) {
                    return;
                }

                setLoadState({
                    repositoryId,
                    status: 'error',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unable to load the selected research record.',
                });
            });

        return () => {
            isCurrent = false;
        };
    }, [repositoryId]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const isCurrentRecord = loadState.repositoryId === repositoryId;
    const isLoading = !isCurrentRecord || loadState.status === 'loading';
    const item =
        isCurrentRecord && loadState.status === 'loaded'
            ? loadState.item
            : null;
    const loadError =
        isCurrentRecord && loadState.status === 'error'
            ? loadState.message
            : null;

    if (!isLoading && item) {
        const pageKey = editPageKeyForDocumentType(item.documentType);

        if (pageKey === 'terminal-report') {
            return (
                <TerminalReportEditPage
                    repositoryId={repositoryId}
                    initialItem={item}
                />
            );
        }

        if (pageKey === 'project-accomplishment') {
            return (
                <ProjectAccomplishmentEditPage
                    repositoryId={repositoryId}
                    initialItem={item}
                />
            );
        }

        return (
            <ResearchStudyEditPage
                repositoryId={repositoryId}
                initialItem={item}
            />
        );
    }

    return (
        <AgencyAdminLayout
            session={session}
            search={search}
            onSearchChange={setSearch}
        >
            <main className="px-4 py-8 lg:px-[47px]">
                <div className="mx-auto max-w-[1200px]">
                    <button
                        type="button"
                        onClick={() => router.visit('/agency/research')}
                        className="mb-4 inline-flex h-8 items-center gap-2 rounded-[10px] px-2 text-sm font-medium text-[#6a7282] hover:bg-white hover:text-[#1e3a8a]"
                    >
                        <ArrowLeft className="size-4" />
                        Back to repository
                    </button>

                    {isLoading ? (
                        <div className="flex min-h-[520px] items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-white text-[#6a7282]">
                            <LoaderCircle className="mr-2 size-5 animate-spin" />
                            Loading document metadata...
                        </div>
                    ) : (
                        <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-white text-center">
                            <AlertCircle className="size-10 text-[#e7000b]" />
                            <h1 className="mt-4 text-xl font-bold text-[#101828]">
                                Document not found
                            </h1>
                            <p className="mt-1 max-w-lg text-sm text-[#6a7282]">
                                {loadError ??
                                    'The selected repository record does not exist in your agency repository.'}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </AgencyAdminLayout>
    );
}
