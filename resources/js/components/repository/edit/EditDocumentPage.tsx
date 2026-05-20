import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    LoaderCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { BasicInformationSection } from '@/components/repository/edit/BasicInformationSection';
import { EditDocumentActions } from '@/components/repository/edit/EditDocumentActions';
import { EditDocumentPreview } from '@/components/repository/edit/EditDocumentPreview';
import { FileInformationSection } from '@/components/repository/edit/FileInformationSection';
import { PublicationInformationSection } from '@/components/repository/edit/PublicationInformationSection';
import { ResearchClassificationSection } from '@/components/repository/edit/ResearchClassificationSection';
import { ResearchStatusPanel } from '@/components/repository/edit/ResearchStatusPanel';
import { VersionHistorySection } from '@/components/repository/edit/VersionHistorySection';
import { getAgencySession } from '@/lib/auth/agency-auth';
import {
    archiveRepositoryItem,
    getRepositoryItemById,
    publishRepositoryItem,
    replaceRepositoryFile,
    saveRepositoryItemAsDraft,
    updateRepositoryItem,
} from '@/lib/repository/repository-service';
import type { AgencyAuthSession } from '@/types/auth';
import type {
    RepositoryAccessType,
    RepositoryItem,
    RepositoryStatus,
    RepositoryUpdatePayload,
} from '@/types/repository';

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

type EditDocumentPageProps = {
    repositoryId: string;
};

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

export function EditDocumentPage({ repositoryId }: EditDocumentPageProps) {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [search, setSearch] = useState('');
    const [item, setItem] = useState<RepositoryItem | null>(null);
    const [form, setForm] = useState<RepositoryUpdatePayload | null>(null);
    const [errors, setErrors] = useState<EditDocumentErrors>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
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
        setMessage(null);
    };

    const commit = async (
        action: 'save' | 'draft' | 'publish',
        payloadOverride?: Partial<RepositoryUpdatePayload>,
    ) => {
        if (!form) {
            return;
        }

        const nextPayload = { ...form, ...payloadOverride };
        const nextErrors = validatePayload(nextPayload);
        setErrors(nextErrors);

        if (hasErrors(nextErrors)) {
            setMessage('Resolve validation issues before saving changes.');

            return;
        }

        setIsSaving(true);

        const saved =
            action === 'draft'
                ? await saveRepositoryItemAsDraft(repositoryId, nextPayload)
                : action === 'publish'
                  ? await publishRepositoryItem(repositoryId, nextPayload)
                  : await updateRepositoryItem(repositoryId, nextPayload);

        if (saved) {
            setItem(saved);
            setForm(emptyPayload(saved));
            setIsDirty(false);
            setMessage(
                action === 'publish'
                    ? 'Research published successfully.'
                    : action === 'draft'
                      ? 'Draft saved successfully.'
                      : 'Changes saved successfully.',
            );
        }

        setIsSaving(false);
    };

    const handleArchive = async () => {
        setIsSaving(true);
        const archived = await archiveRepositoryItem(repositoryId);

        if (archived) {
            setItem(archived);
            setForm(emptyPayload(archived));
            setIsDirty(false);
            setMessage('Research record archived.');
        }

        setShowArchiveConfirm(false);
        setIsSaving(false);
    };

    const handleReplaceFile = async (file: File) => {
        if (!form) {
            return;
        }

        const replaced = await replaceRepositoryFile(repositoryId, {
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            type: file.type || 'PDF Document',
        });

        if (replaced) {
            setItem(replaced);
            setForm(emptyPayload(replaced));
            setMessage('Document file replaced in the mock repository.');
        }
    };

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
                        onClick={() =>
                            router.visit('/agency/research-repository')
                        }
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
                                the mock dataset.
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
                                    {isDirty ? (
                                        <span className="h-[30px] rounded-full border border-[#fee685] bg-[#fffbeb] px-3 py-1.5 text-xs font-semibold text-[#bb4d00]">
                                            Unsaved changes
                                        </span>
                                    ) : (
                                        <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[#b9f8cf] bg-[#f0fdf4] px-3 text-xs font-semibold text-[#008236]">
                                            <CheckCircle2 className="size-3.5" />
                                            Synced
                                        </span>
                                    )}
                                </div>
                            </header>

                            {message ? (
                                <div className="mt-5 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1e3a8a]">
                                    {message}
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
                                        file={form.file}
                                        fileInputRef={fileInputRef}
                                        onReplaceFile={handleReplaceFile}
                                        onDownload={() =>
                                            setMessage(
                                                'Mock download prepared for the current document file.',
                                            )
                                        }
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
                                        onStatusChange={(
                                            status: RepositoryStatus,
                                        ) => updateForm({ status })}
                                        onAccessChange={(
                                            accessType: RepositoryAccessType,
                                        ) => updateForm({ accessType })}
                                        onChange={updateForm}
                                    />
                                    <VersionHistorySection
                                        versions={form.versions}
                                    />
                                </aside>
                            </section>

                            <EditDocumentActions
                                isSaving={isSaving}
                                onSave={() => commit('save')}
                                onSaveDraft={() => commit('draft')}
                                onPublish={() => commit('publish')}
                                onArchive={() => setShowArchiveConfirm(true)}
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
                            This keeps the document in the mock repository but
                            marks it as archived for agency management.
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
