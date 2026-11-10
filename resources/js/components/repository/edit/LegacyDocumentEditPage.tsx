import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    LoaderCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { BasicInformationSection } from '@/components/repository/edit/BasicInformationSection';
import type {
    DocumentEditPageProps,
    EditDocumentErrors,
} from '@/components/repository/edit/document-edit-page';
import { DocumentSyncStatus } from '@/components/repository/edit/DocumentSyncStatus';
import { EditDocumentActions } from '@/components/repository/edit/EditDocumentActions';
import { EditDocumentPreview } from '@/components/repository/edit/EditDocumentPreview';
import { FileInformationSection } from '@/components/repository/edit/FileInformationSection';
import { PublicationInformationSection } from '@/components/repository/edit/PublicationInformationSection';
import { ResearchClassificationSection } from '@/components/repository/edit/ResearchClassificationSection';
import { ResearchStatusPanel } from '@/components/repository/edit/ResearchStatusPanel';
import { SectionCard } from '@/components/repository/edit/SectionCard';
import { VersionHistorySection } from '@/components/repository/edit/VersionHistorySection';
import { RevisionRequestPanel } from '@/components/repository/RevisionRequestPanel';
import { useSmartSync } from '@/hooks/use-smart-sync';
import { getAgencyAiResults } from '@/lib/agency/agency-ai-results-service';
import type { AgencyAiResults } from '@/lib/agency/agency-ai-results-service';
import { apiMessage } from '@/lib/api-client';
import { useAgencySession } from '@/lib/auth/agency-auth';
import {
    archiveRepositoryItem,
    createRepositoryRevision,
    downloadRepositoryFile,
    getRepositoryItemById,
    publishRepositoryItem,
    addRepositoryFiles,
    saveRepositoryItemAsDraft,
    updateRepositoryItem,
} from '@/lib/repository/repository-service';
import { toast } from '@/lib/toast';
import type {
    RepositoryAccessType,
    RepositoryFileInfo,
    RepositoryItem,
    RepositoryUpdatePayload,
} from '@/types/repository';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const emptyPayload = (item: RepositoryItem): RepositoryUpdatePayload => ({
    title: item.title,
    abstract: item.abstract,
    authors: item.authors,
    agency: item.agency,
    documentType: item.documentType,
    year: item.year,
    status: item.status,
    accessType: item.accessType,
    sdgs: item.sdgs,
    category: item.category,
    keywords: item.keywords,
    metadataCompletion: item.metadataCompletion,
    digitalLibraryScore: item.digitalLibraryScore,
    isAiTagged: item.isAiTagged,
    publisher: item.publisher,
    doi: item.doi ?? '',
    isbn: item.isbn ?? '',
    externalLink: item.externalLink ?? '',
    embargoUntil: item.embargoUntil ?? '',
    file: item.file,
    versions: item.versions,
});

const validatePayload = (payload: RepositoryUpdatePayload) => {
    const errors: EditDocumentErrors = {};
    const authorEmailErrors: Record<number, string> = {};

    if (!payload.title.trim()) {
        errors.title = 'Research title is required.';
    }

    const namedAuthors = payload.authors.filter((author) => author.name.trim());

    if (namedAuthors.length === 0) {
        errors.authors = 'Add at least one author name.';
    }

    payload.authors.forEach((author, index) => {
        if (author.email.trim() && !emailPattern.test(author.email.trim())) {
            authorEmailErrors[index] = 'Use a valid email address.';
        }
    });

    if (Object.keys(authorEmailErrors).length > 0) {
        errors.authorEmails = authorEmailErrors;
    }

    if (!payload.category.trim()) {
        errors.category = 'Research category is required.';
    }

    if (payload.sdgs.length === 0) {
        errors.sdgs = 'Select at least one SDG tag.';
    }

    if (!Number.isInteger(payload.year) || payload.year < 1900) {
        errors.year = 'Enter a valid publication year.';
    }

    if (!payload.accessType) {
        errors.accessType = 'Choose an access control option.';
    }

    if (payload.accessType === 'external-link') {
        try {
            new URL(payload.externalLink ?? '');
        } catch {
            errors.externalLink = 'Enter a valid external URL.';
        }
    }

    if (payload.accessType === 'embargo' && !payload.embargoUntil) {
        errors.embargoUntil = 'Embargo date is required.';
    }

    return errors;
};

const hasErrors = (errors: EditDocumentErrors) =>
    Object.entries(errors).some(([, value]) =>
        typeof value === 'string'
            ? Boolean(value)
            : Object.keys(value).length > 0,
    );

function canEditRepositoryItem(item: RepositoryItem | null) {
    return Boolean(
        item?.capabilities.canUpdate &&
        (item.status === 'draft' || item.status === 'revision-required'),
    );
}

function editLockMessage(item: RepositoryItem | null) {
    if (!item) {
        return null;
    }

    if (item.status === 'pending') {
        return 'Submitted research is pending moderation and cannot be edited unless an administrator returns it to draft.';
    }

    if (item.status === 'revision-required' && !item.capabilities.canUpdate) {
        return 'A revision was requested, but your account is not authorized to edit this agency record.';
    }

    if (item.status === 'published') {
        return 'Published research is locked. Create a draft revision to edit changes without changing the public record yet.';
    }

    if (item.status === 'archived') {
        return 'Archived research must be restored before it can be edited.';
    }

    if (item.status === 'superseded') {
        return 'This version has been superseded by a newer published revision and is kept read-only for audit history.';
    }

    return null;
}

export function LegacyDocumentEditPage({
    repositoryId,
    initialItem,
}: DocumentEditPageProps) {
    const session = useAgencySession();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [search, setSearch] = useState('');
    const [item, setItem] = useState<RepositoryItem | null>(
        initialItem ?? null,
    );
    const [form, setForm] = useState<RepositoryUpdatePayload | null>(() =>
        initialItem ? emptyPayload(initialItem) : null,
    );
    const [errors, setErrors] = useState<EditDocumentErrors>({});
    const [isLoading, setIsLoading] = useState(!initialItem);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [aiResults, setAiResults] = useState<AgencyAiResults | null>(null);
    const [aiResultsMessage, setAiResultsMessage] = useState(
        'Loading AI suggestions...',
    );
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [, setIsDirty] = useState(false);
    const sync = useSmartSync();

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        if (initialItem && initialItem.id === repositoryId) {
            return;
        }

        let isCurrent = true;

        getRepositoryItemById(repositoryId).then((record) => {
            if (!isCurrent) {
                return;
            }

            setItem(record);
            setForm(record ? emptyPayload(record) : null);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [initialItem, repositoryId]);

    useEffect(() => {
        let isCurrent = true;

        getAgencyAiResults(repositoryId)
            .then((results) => {
                if (!isCurrent) {
                    return;
                }

                setAiResults(results);
                setAiResultsMessage('');
            })
            .catch(() => {
                if (isCurrent) {
                    setAiResultsMessage(
                        'AI/PDF/SDG suggestions are not available yet.',
                    );
                }
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

    const updateForm = (patch: Partial<RepositoryUpdatePayload>) => {
        setForm((current) => (current ? { ...current, ...patch } : current));
        setIsDirty(true);
        sync.markChanged();
        setMessage(null);
    };

    const commit = async (
        action: 'save' | 'draft' | 'publish',
        payloadOverride?: Partial<RepositoryUpdatePayload>,
    ) => {
        if (!form) {
            return;
        }

        if (!canEditRepositoryItem(item)) {
            setMessage(editLockMessage(item));

            return;
        }

        const nextPayload = { ...form, ...payloadOverride };
        const nextErrors = validatePayload(nextPayload);
        setErrors(nextErrors);

        if (hasErrors(nextErrors)) {
            toast.warning(
                'Resolve validation issues',
                'Correct the highlighted fields before saving changes.',
            );

            return;
        }

        setIsSaving(true);
        const saveToken = sync.beginSave();

        try {
            const saved =
                action === 'draft'
                    ? await saveRepositoryItemAsDraft(repositoryId, nextPayload)
                    : action === 'publish'
                      ? await publishRepositoryItem(repositoryId, nextPayload)
                      : await updateRepositoryItem(repositoryId, nextPayload);

            if (saved) {
                setItem(saved);
                const currentVersionSaved = sync.completeSave(saveToken);

                if (currentVersionSaved) {
                    setForm(emptyPayload(saved));
                    setIsDirty(false);
                }

                toast.success(
                    action === 'publish'
                        ? 'Research submitted successfully'
                        : action === 'draft'
                          ? 'Draft saved'
                          : 'Changes saved',
                    currentVersionSaved
                        ? action === 'publish'
                            ? 'Your research is now pending moderation.'
                            : 'The server confirmed the current document version.'
                        : 'Newer edits remain unsaved and are still available.',
                );
            }
        } catch (error) {
            sync.failSave(saveToken);
            toast.error(
                'Unable to save changes',
                apiMessage(
                    error,
                    'Please try again. Your unsaved changes are still available.',
                ),
            );
        }

        setIsSaving(false);
    };

    const handleArchive = async () => {
        if (!canEditRepositoryItem(item)) {
            setMessage(editLockMessage(item));
            setShowArchiveConfirm(false);

            return;
        }

        setIsSaving(true);
        const archiveToastId = toast.loading('Archiving research record');

        try {
            const archived = await archiveRepositoryItem(repositoryId);

            if (archived) {
                setItem(archived);
                setForm(emptyPayload(archived));
                setIsDirty(false);
                toast.update(archiveToastId, {
                    type: 'success',
                    title: 'Research record archived',
                });
            }
        } catch (error) {
            toast.update(archiveToastId, {
                type: 'error',
                title: 'Unable to archive research',
                description: apiMessage(error, 'Refresh and try again.'),
            });
        } finally {
            setShowArchiveConfirm(false);
            setIsSaving(false);
        }
    };

    const handleCreateRevision = async () => {
        if (item?.status !== 'published') {
            setMessage('Only published research can be revised.');

            return;
        }

        setIsSaving(true);

        try {
            const revision = await createRepositoryRevision(repositoryId);

            if (revision) {
                toast.success(
                    'Draft revision created',
                    'You can now edit the new revision.',
                );
                router.visit(`/agency/research/${revision.id}`);
            }
        } catch (error) {
            toast.error(
                'Unable to create draft revision',
                apiMessage(error, 'Refresh and try again.'),
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFiles = async (files: File[]) => {
        if (!form) {
            return;
        }

        if (!canEditRepositoryItem(item)) {
            setMessage(editLockMessage(item));

            return;
        }

        setIsUploadingFiles(true);
        const uploadToastId = toast.loading(
            files.length === 1 ? 'Uploading document' : 'Uploading documents',
            'Please keep this page open until the upload completes.',
        );

        try {
            const updated = await addRepositoryFiles(
                repositoryId,
                files,
                form.documentType,
            );

            if (updated) {
                setItem(updated);
                setForm((current) =>
                    current
                        ? { ...current, file: updated.file }
                        : emptyPayload(updated),
                );
                toast.update(uploadToastId, {
                    type: 'success',
                    title:
                        files.length === 1
                            ? 'Document uploaded'
                            : 'Documents uploaded',
                    description:
                        files.length === 1
                            ? 'The document was added to the repository.'
                            : `${files.length} documents were added to the repository.`,
                });
            }
        } catch (error) {
            const refreshed = await getRepositoryItemById(repositoryId).catch(
                () => null,
            );

            if (refreshed) {
                setItem(refreshed);
                setForm((current) =>
                    current
                        ? { ...current, file: refreshed.file }
                        : emptyPayload(refreshed),
                );
            }

            toast.update(uploadToastId, {
                type: 'error',
                title: 'Document upload failed',
                description: `${apiMessage(error, 'Unable to add the selected documents.')} Any files uploaded before the error remain attached.`,
            });
        } finally {
            setIsUploadingFiles(false);
        }
    };

    const handleDownloadFile = async (file: RepositoryFileInfo) => {
        if (!file.id || !file.canDownload) {
            setMessage('No downloadable repository file is available yet.');

            return;
        }

        try {
            await downloadRepositoryFile(repositoryId, file.id, file.name);
            toast.info(
                'Download started',
                `${file.name} is being downloaded.`,
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to download research file.',
            );
        }
    };

    const canEdit = canEditRepositoryItem(item);
    const canSubmit = canEdit && item?.capabilities.canSubmit === true;
    const lockedMessage = editLockMessage(item);
    const canCreateRevision = item?.status === 'published';

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
                    ) : null}

                    {!isLoading && !item ? (
                        <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-white text-center">
                            <AlertCircle className="size-10 text-[#e7000b]" />
                            <h1 className="mt-4 text-xl font-bold text-[#101828]">
                                Document not found
                            </h1>
                            <p className="mt-1 text-sm text-[#6a7282]">
                                The selected repository record does not exist in
                                your agency repository.
                            </p>
                        </div>
                    ) : null}

                    {!isLoading && form && item ? (
                        <>
                            <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                <div>
                                    <nav className="flex h-4 items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                                        <span>Dashboard</span>
                                        <span>/</span>
                                        <span>Research Repository</span>
                                        <span>/</span>
                                        <span className="font-semibold text-[#1e3a8a]">
                                            Edit Document
                                        </span>
                                    </nav>
                                    <h1 className="mt-2 text-2xl leading-9 font-bold text-[#1e3a8a]">
                                        Edit Document
                                    </h1>
                                    <p className="text-sm leading-5 text-[#6a7282]">
                                        Update research metadata, access rules,
                                        file details, and publication status.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DocumentSyncStatus state={sync.state} />
                                </div>
                            </header>

                            {message ? (
                                <div className="mt-5 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1e3a8a]">
                                    {message}
                                </div>
                            ) : null}
                            <div className="mt-5">
                                <RevisionRequestPanel item={item} />
                            </div>
                            {!message && lockedMessage ? (
                                <div className="mt-5 rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
                                    {lockedMessage}
                                </div>
                            ) : null}

                            <section className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,820px)_360px]">
                                <div className="space-y-5">
                                    <BasicInformationSection
                                        form={form}
                                        errors={errors}
                                        onChange={updateForm}
                                    />
                                    <ResearchClassificationSection
                                        form={form}
                                        errors={errors}
                                        onChange={updateForm}
                                    />
                                    <PublicationInformationSection
                                        form={form}
                                        errors={errors}
                                        onChange={updateForm}
                                    />
                                    <FileInformationSection
                                        files={item.files}
                                        fileInputRef={fileInputRef}
                                        onAddFiles={handleAddFiles}
                                        onDownload={handleDownloadFile}
                                        disabled={!canEdit}
                                        isUploading={isUploadingFiles}
                                    />
                                </div>

                                <aside className="space-y-5 xl:sticky xl:top-[88px]">
                                    <EditDocumentPreview form={form} />
                                    <ResearchStatusPanel
                                        status={form.status}
                                        accessType={form.accessType}
                                        embargoUntil={form.embargoUntil ?? ''}
                                        externalLink={form.externalLink ?? ''}
                                        errors={errors}
                                        disabled={!canEdit}
                                        onAccessChange={(
                                            accessType: RepositoryAccessType,
                                        ) => updateForm({ accessType })}
                                        onChange={updateForm}
                                    />
                                    <VersionHistorySection
                                        versions={form.versions}
                                    />
                                    <AiSuggestionsPanel
                                        results={aiResults}
                                        message={aiResultsMessage}
                                    />
                                </aside>
                            </section>

                            <EditDocumentActions
                                isSaving={isSaving}
                                canEdit={canEdit}
                                canSubmit={canSubmit}
                                isRevisionRequired={
                                    item.status === 'revision-required'
                                }
                                lockedMessage={lockedMessage ?? undefined}
                                onSave={() => commit('save')}
                                onSaveDraft={() => commit('draft')}
                                onPublish={() => commit('publish')}
                                onArchive={() => setShowArchiveConfirm(true)}
                                canCreateRevision={canCreateRevision}
                                onCreateRevision={handleCreateRevision}
                            />
                        </>
                    ) : null}
                </div>
            </main>

            {showArchiveConfirm ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-[420px] rounded-[16px] bg-white p-5 shadow-[0px_20px_40px_rgba(15,23,42,0.22)]">
                        <h2 className="text-lg font-bold text-[#101828]">
                            Archive research record?
                        </h2>
                        <p className="mt-2 text-sm leading-5 text-[#6a7282]">
                            This marks the document as archived for agency
                            repository management.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowArchiveConfirm(false)}
                                className="h-9 rounded-[10px] border border-[#e5e7eb] px-4 text-sm font-semibold text-[#4a5565]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleArchive}
                                className="h-9 rounded-[10px] bg-[#e7000b] px-4 text-sm font-semibold text-white"
                            >
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </AgencyAdminLayout>
    );
}

function AiSuggestionsPanel({
    results,
    message,
}: {
    results: AgencyAiResults | null;
    message: string;
}) {
    const metadata = results?.ai_metadata;
    const sdg = results?.sdg_classification;
    const pdf = results?.pdf_parsing_result;
    const suggestedSdgs =
        sdg?.suggested_sdg_tags?.map((tag) =>
            typeof tag === 'string'
                ? tag
                : [tag.sdg, tag.label].filter(Boolean).join(' - '),
        ) ?? [];

    return (
        <SectionCard
            eyebrow="Suggested"
            title="AI/PDF/SDG Results"
            description="Read-only suggestions from secondary metadata storage."
        >
            {message ? (
                <p className="text-sm leading-5 text-[#6a7282]">{message}</p>
            ) : (
                <div className="space-y-4 text-sm">
                    <AiSuggestionRow
                        label="PDF parsing"
                        value={
                            pdf?.status === 'not_available'
                                ? 'Pending Review'
                                : `${pdf?.status ?? 'Pending Review'}${
                                      pdf?.page_count
                                          ? ` - ${pdf.page_count} pages`
                                          : ''
                                  }`
                        }
                    />
                    <AiSuggestionRow
                        label="Extracted title"
                        value={
                            metadata?.extracted_title ??
                            metadata?.message ??
                            'Pending Review'
                        }
                    />
                    <AiSuggestionRow
                        label="Keywords"
                        value={
                            metadata?.extracted_keywords?.join(', ') ??
                            'Pending Review'
                        }
                    />
                    <AiSuggestionRow
                        label="SDG suggestions"
                        value={
                            suggestedSdgs.length > 0
                                ? suggestedSdgs.join(', ')
                                : 'Pending Review'
                        }
                    />
                </div>
            )}
        </SectionCard>
    );
}

function AiSuggestionRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[11px] font-bold text-[#6a7282] uppercase">
                {label}
            </p>
            <p className="mt-1 leading-5 text-[#101828]">{value}</p>
        </div>
    );
}
