import { router } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Eye,
    FileText,
    LoaderCircle,
    Plus,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import type { DocumentEditPageProps } from '@/components/repository/edit/document-edit-page';
import { DocumentSyncStatus } from '@/components/repository/edit/DocumentSyncStatus';
import { EditDocumentActions } from '@/components/repository/edit/EditDocumentActions';
import {
    DetailsSection,
    FinancialSection,
    HighlightsSection,
    MetadataSection,
    PAPSection,
    PerformanceSection,
    SDGSection,
    ReportSection,
} from '@/components/repository/edit/reports/ReportEditSections';
import type { ReportEditFieldErrors } from '@/components/repository/edit/reports/ReportEditSections';
import {
    repositoryAccessTypeLabels,
    repositoryStatusLabels,
} from '@/data/repository-display';
import { useSmartSync } from '@/hooks/use-smart-sync';
import { getAgencyAiResults } from '@/lib/agency/agency-ai-results-service';
import type { AgencyAiResults } from '@/lib/agency/agency-ai-results-service';
import { getAgencyResearch } from '@/lib/agency/agency-research-service';
import type {
    AgencyResearchHighlight,
    AgencyResearchRecord,
} from '@/lib/agency/agency-research-service';
import { apiMessage } from '@/lib/api-client';
import { useAgencySession } from '@/lib/auth/agency-auth';
import {
    archiveRepositoryItem,
    createRepositoryRevision,
    downloadRepositoryFile,
    getRepositoryItemById,
    previewRepositoryFile,
} from '@/lib/repository/repository-service';
import { toast } from '@/lib/toast';
import {
    hydrateReportWorkflowFromRecord,
    mapReportWorkflowToResearchPayload,
    removeReportFile,
    reportHighlightFileError,
    saveReportDraft,
    submitReport,
    uploadReportFile,
    uploadReportHighlightFile,
} from '@/lib/upload/services/report-upload-service';
import type { ReportPersistenceOverrides } from '@/lib/upload/services/report-upload-service';
import type { RepositoryAccessType, RepositoryItem } from '@/types/repository';
import type {
    ReportAIMetadataFields,
    ReportDocumentType,
    ReportWorkflowData,
} from '@/types/upload/reportWorkflow';

const sections = [
    ['report-details', 'Project & Report Details'],
    ['report-metadata', 'Research Metadata & AI'],
    ['report-performance', 'Performance & Accomplishments'],
    ['report-pap', 'PAP Classification'],
    ['report-financials', 'Financial Information'],
    ['report-highlights', 'Project Highlights'],
    ['report-sdgs', 'SDG Tagging'],
    ['report-files', 'Document Files'],
    ['report-review', 'Review & History'],
] as const;

const canEdit = (item: RepositoryItem) =>
    item.capabilities.canUpdate &&
    (item.status === 'draft' || item.status === 'revision-required');

function lockMessage(item: RepositoryItem) {
    if (item.status === 'pending') {
        return 'This report is pending moderation and is read-only.';
    }

    if (item.status === 'published') {
        return 'Published reports are read-only. Create a draft revision to make changes.';
    }

    if (item.status === 'archived') {
        return 'Archived reports are read-only until restored.';
    }

    if (item.status === 'superseded') {
        return 'This report has been superseded and is retained for history.';
    }

    return 'Your account is not authorized to edit this report.';
}

function persistenceOverrides(
    accessType: RepositoryAccessType,
    embargoUntil: string,
    externalLink: string,
): ReportPersistenceOverrides {
    return {
        access_level:
            accessType === 'request-access'
                ? 'request_required'
                : accessType === 'embargo'
                  ? 'embargoed'
                  : accessType === 'external-link'
                    ? 'restricted'
                    : accessType,
        embargo_until: accessType === 'embargo' ? embargoUntil || null : null,
        external_url:
            accessType === 'external-link' ? externalLink.trim() || null : null,
    };
}

function editorPersistenceOverrides(
    data: ReportWorkflowData,
    additionalHighlights: AgencyResearchHighlight[],
    accessType: RepositoryAccessType,
    embargoUntil: string,
    externalLink: string,
): ReportPersistenceOverrides {
    const editableHighlight =
        mapReportWorkflowToResearchPayload(data).report_highlights ?? [];
    const persistedAdditionalHighlights = additionalHighlights.map(
        (highlight, index) => ({
            id: highlight.id,
            title: highlight.title,
            description: highlight.description,
            is_featured: highlight.is_featured,
            sort_order: highlight.sort_order ?? index + 1,
        }),
    );

    return {
        ...persistenceOverrides(accessType, embargoUntil, externalLink),
        report_highlights: [
            ...editableHighlight,
            ...persistedAdditionalHighlights,
        ],
    };
}

function validate(data: ReportWorkflowData, submit: boolean) {
    const errors: ReportEditFieldErrors = {};
    const year = Number(data.details.reportingYear);

    if (!data.details.reportTitle.trim()) {
        errors.reportTitle = 'Report title is required.';
    }

    if (
        !['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'].includes(
            data.details.reportingPeriod,
        )
    ) {
        errors.reportingPeriod = 'Choose a valid reporting period.';
    }

    if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > new Date().getFullYear() + 1
    ) {
        errors.reportingYear = 'Enter a valid four-digit reporting year.';
    }

    if (
        data.details.projectStartDate &&
        data.details.projectEndDate &&
        Date.parse(data.details.projectEndDate) <
            Date.parse(data.details.projectStartDate)
    ) {
        errors.projectEndDate =
            'Project end date must be on or after the start date.';
    }

    const physical = data.performance.physicalAccomplishmentPercent;

    if (physical !== null && (physical < 0 || physical > 100)) {
        errors.physicalAccomplishmentPercent =
            'Official accomplishment must be between 0 and 100.';
    }

    for (const key of [
        'allocatedBudget',
        'releasedAmount',
        'obligatedAmount',
        'usedBudget',
    ] as const) {
        if (data.financials[key] !== null && data.financials[key]! < 0) {
            errors[key] = 'Financial amounts cannot be negative.';
        }
    }

    if (submit) {
        if (!data.details.uploadedFileId) {
            errors.files = 'A report PDF is required.';
        }

        if (!data.aiMetadata.extractedMetadata.abstract.trim()) {
            errors.metadata = 'An abstract is required before submission.';
        }

        if (!data.aiMetadata.selectedPublicMetadata.length) {
            errors.publicMetadata =
                'Select at least one public metadata field.';
        }

        if (!data.sdgTagging.selectedSDGs.length) {
            errors.sdgs = 'Select at least one SDG.';
        }
    }

    return errors;
}

function metadataSuggestions(results: AgencyAiResults | null) {
    const item = results?.ai_metadata;

    return {
        title: item?.extracted_title ?? undefined,
        abstract: item?.extracted_abstract ?? undefined,
        methodology: item?.extracted_methodology ?? undefined,
        reviewOfRelatedLiterature:
            item?.extracted_review_of_related_literature ?? undefined,
        theoreticalFramework:
            item?.extracted_theoretical_framework ?? undefined,
        resultsAndDiscussion:
            item?.extracted_results_and_discussion ?? undefined,
        keywords: item?.extracted_keywords,
        authors: item?.extracted_authors,
    } satisfies Partial<ReportAIMetadataFields>;
}

function suggestedSdgs(results: AgencyAiResults | null) {
    return (
        results?.sdg_classification.suggested_sdg_tags
            ?.map((tag) =>
                Number.parseInt(
                    (typeof tag === 'string' ? tag : (tag.sdg ?? '')).replace(
                        /\D+/gu,
                        '',
                    ),
                    10,
                ),
            )
            .filter(
                (value) => Number.isInteger(value) && value >= 1 && value <= 17,
            ) ?? []
    );
}

type ReportEditPageProps = DocumentEditPageProps & {
    documentType: ReportDocumentType;
    documentLabel: string;
    breadcrumbLabel: string;
    allowMultipleHighlights?: boolean;
};

export function ReportEditPage({
    repositoryId,
    initialItem,
    documentType,
    documentLabel,
    breadcrumbLabel,
    allowMultipleHighlights = false,
}: ReportEditPageProps) {
    const session = useAgencySession();
    const replacementRef = useRef<HTMLInputElement | null>(null);
    const [search, setSearch] = useState('');
    const [item, setItem] = useState(initialItem);
    const [record, setRecord] = useState<AgencyResearchRecord | null>(null);
    const [additionalHighlights, setAdditionalHighlights] = useState<
        AgencyResearchHighlight[]
    >([]);
    const [form, setForm] = useState<ReportWorkflowData | null>(null);
    const [aiResults, setAiResults] = useState<AgencyAiResults | null>(null);
    const [activeSection, setActiveSection] = useState<
        (typeof sections)[number][0]
    >(sections[0][0]);
    const [errors, setErrors] = useState<ReportEditFieldErrors>({});
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fileBusy, setFileBusy] = useState(false);
    const [, setDirty] = useState(false);
    const [accessType, setAccessType] = useState(initialItem.accessType);
    const [embargoUntil, setEmbargoUntil] = useState(
        initialItem.embargoUntil ?? '',
    );
    const [externalLink, setExternalLink] = useState(
        initialItem.externalLink ?? '',
    );
    const sync = useSmartSync();

    const hydrate = (nextRecord: AgencyResearchRecord, results = aiResults) => {
        const next = hydrateReportWorkflowFromRecord(
            nextRecord,
            item.agency,
            documentType,
        );
        next.sdgTagging.aiSuggestedSDGs = suggestedSdgs(results);
        setRecord(nextRecord);
        setAdditionalHighlights((nextRecord.report_highlights ?? []).slice(1));
        setForm(next);
    };

    const reload = async () => {
        const [nextRecord, nextItem] = await Promise.all([
            getAgencyResearch(repositoryId),
            getRepositoryItemById(repositoryId),
        ]);

        if (nextItem) {
            setItem(nextItem);
            setAccessType(nextItem.accessType);
            setEmbargoUntil(nextItem.embargoUntil ?? '');
            setExternalLink(nextItem.externalLink ?? '');
        }

        hydrate(nextRecord);

        return nextRecord;
    };

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        let current = true;
        Promise.allSettled([
            getAgencyResearch(repositoryId),
            getAgencyAiResults(repositoryId),
        ]).then(([recordResult, aiResult]) => {
            if (!current) {
                return;
            }

            if (recordResult.status === 'rejected') {
                setMessage(
                    apiMessage(
                        recordResult.reason,
                        `Unable to load the ${documentLabel}.`,
                    ),
                );
                setLoading(false);

                return;
            }

            const results =
                aiResult.status === 'fulfilled' ? aiResult.value : null;
            const next = hydrateReportWorkflowFromRecord(
                recordResult.value,
                initialItem.agency,
                documentType,
            );
            next.sdgTagging.aiSuggestedSDGs = suggestedSdgs(results);
            setRecord(recordResult.value);
            setAiResults(results);
            setForm(next);
            setLoading(false);
        });

        return () => {
            current = false;
        };
    }, [documentLabel, documentType, initialItem.agency, repositoryId]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const editable = canEdit(item);
    const overrides =
        form && record
            ? editorPersistenceOverrides(
                  form,
                  additionalHighlights,
                  accessType,
                  embargoUntil,
                  externalLink,
              )
            : persistenceOverrides(accessType, embargoUntil, externalLink);
    const change = (next: ReportWorkflowData) => {
        setForm(next);
        setDirty(true);
        sync.markChanged();
        setMessage(null);
    };

    const save = async (submit: boolean) => {
        if (!form || !editable) {
            return setMessage(lockMessage(item));
        }

        const nextErrors = validate(form, submit);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            return setMessage(
                'Resolve the highlighted report issues before saving.',
            );
        }

        setSaving(true);
        const saveToken = sync.beginSave();

        try {
            const saved = submit
                ? await submitReport(form, overrides)
                : await saveReportDraft(form, overrides);
            const currentVersionSaved = sync.completeSave(saveToken);

            if (currentVersionSaved) {
hydrate(saved);
}

            const nextItem = await getRepositoryItemById(repositoryId);

            if (nextItem) {
                setItem(nextItem);
            }

            if (currentVersionSaved) {
setDirty(false);
}

            toast.success(
                submit
                    ? `${documentLabel} submitted successfully`
                    : `${documentLabel} saved`,
                currentVersionSaved
                    ? submit
                        ? 'The document is now pending moderation.'
                        : 'The server confirmed the current document version.'
                    : 'Newer edits remain unsaved and are still available.',
            );
        } catch (error) {
            sync.failSave(saveToken);
            toast.error(
                `Unable to save the ${documentLabel}`,
                apiMessage(error, 'Your unsaved changes are still available.'),
            );
        } finally {
            setSaving(false);
        }
    };

    const replacePdf = async (file: File) => {
        if (!editable) {
            return;
        }

        setFileBusy(true);
        const uploadToastId = toast.loading(
            `Uploading ${documentLabel} PDF`,
            'Please keep this page open until the upload completes.',
        );

        try {
            await uploadReportFile(repositoryId, file, documentType);
            await reload();
            toast.update(uploadToastId, {
                type: 'success',
                title: `${documentLabel} PDF uploaded`,
                description:
                    'The prior file remains preserved in repository history.',
            });
        } catch (error) {
            toast.update(uploadToastId, {
                type: 'error',
                title: 'PDF replacement failed',
                description: apiMessage(
                    error,
                    'The existing PDF was not changed.',
                ),
            });
        } finally {
            setFileBusy(false);
        }
    };

    const addHighlightFile = async (file: File) => {
        if (!form || !editable) {
            return;
        }

        const uploadError = reportHighlightFileError(
            file,
            form.highlights.supportingFiles.length,
        );

        if (
            uploadError ||
            !form.highlights.highlightTitle.trim() ||
            form.highlights.highlightDescription.trim().length < 40
        ) {
            return change({
                ...form,
                highlights: {
                    ...form.highlights,
                    uploadError:
                        uploadError ??
                        'Enter a title and a 40-character description first.',
                },
            });
        }

        setFileBusy(true);
        const uploadToastId = toast.loading(
            'Uploading supporting file',
            'Please keep this page open until the upload completes.',
        );

        try {
            const saved = await saveReportDraft(form, overrides);
            const highlight = saved.report_highlights?.[0];

            if (!highlight?.id) {
                throw new Error('Unable to save the highlight.');
            }

            await uploadReportHighlightFile(repositoryId, highlight.id, file);
            await reload();
            setDirty(false);
            toast.update(uploadToastId, {
                type: 'success',
                title: 'Supporting file uploaded',
                description: 'The file was scanned and attached securely.',
            });
        } catch (error) {
            toast.update(uploadToastId, {
                type: 'error',
                title: 'Supporting file upload failed',
                description: apiMessage(
                    error,
                    'The selected file could not be uploaded.',
                ),
            });
        } finally {
            setFileBusy(false);
        }
    };

    const removeAttachment = async (fileId: string) => {
        if (!editable || !window.confirm('Remove this supporting file?')) {
            return;
        }

        setFileBusy(true);
        const removeToastId = toast.loading('Removing supporting file');

        try {
            await removeReportFile(repositoryId, fileId);
            await reload();
            toast.update(removeToastId, {
                type: 'success',
                title: 'Supporting file removed',
                description: 'The file was moved to the archive.',
            });
        } catch (error) {
            toast.update(removeToastId, {
                type: 'error',
                title: 'Unable to remove the file',
                description: apiMessage(error, 'Refresh and try again.'),
            });
        } finally {
            setFileBusy(false);
        }
    };

    const addAdditionalHighlightFile = async (
        highlight: AgencyResearchHighlight,
        file: File,
    ) => {
        if (!editable || !highlight.id) {
            return setMessage(
                'Save the new highlight before adding supporting files.',
            );
        }

        const uploadError = reportHighlightFileError(
            file,
            highlight.files?.length ?? 0,
        );

        if (uploadError) {
            return setMessage(uploadError);
        }

        setFileBusy(true);

        try {
            await uploadReportHighlightFile(repositoryId, highlight.id, file);
            await reload();
            setMessage('Supporting file uploaded securely.');
        } catch (error) {
            setMessage(
                apiMessage(error, 'Unable to upload the supporting file.'),
            );
        } finally {
            setFileBusy(false);
        }
    };

    const createRevision = async () => {
        setSaving(true);

        try {
            const revision = await createRepositoryRevision(repositoryId);

            if (revision) {
                router.visit(`/agency/research/${revision.id}`);
            }
        } catch (error) {
            setMessage(apiMessage(error, 'Unable to create a draft revision.'));
        } finally {
            setSaving(false);
        }
    };

    const archive = async () => {
        if (!editable || !window.confirm(`Archive this ${documentLabel}?`)) {
            return;
        }

        setSaving(true);

        try {
            const archived = await archiveRepositoryItem(repositoryId);

            if (archived) {
                setItem(archived);
                setMessage(`${documentLabel} archived.`);
            }
        } catch (error) {
            setMessage(apiMessage(error, 'Unable to archive the report.'));
        } finally {
            setSaving(false);
        }
    };

    const suggestions = metadataSuggestions(aiResults);
    const processingStatus =
        aiResults?.ai_metadata.processing_status ??
        aiResults?.ai_metadata.status ??
        'not available';

    return (
        <AgencyAdminLayout
            session={session}
            search={search}
            onSearchChange={setSearch}
        >
            <main className="px-4 py-8 lg:px-[47px]">
                <div className="mx-auto max-w-[1280px]">
                    <button
                        type="button"
                        onClick={() => router.visit('/agency/research')}
                        className="mb-4 inline-flex h-8 items-center gap-2 rounded-[10px] px-2 text-sm font-medium text-[#6a7282] hover:bg-white hover:text-[#1e3a8a]"
                    >
                        <ArrowLeft className="size-4" />
                        Back to repository
                    </button>
                    {loading || !form || !record ? (
                        <div className="flex min-h-[520px] items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-white text-[#6a7282]">
                            <LoaderCircle className="mr-2 size-5 animate-spin" />
                            Loading {documentLabel}...
                        </div>
                    ) : (
                        <>
                            <header className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
                                <p className="text-xs text-[#99a1af]">
                                    Research Repository / {breadcrumbLabel} /
                                    Edit Report
                                </p>
                                <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row">
                                    <div>
                                        <h1 className="text-2xl font-bold text-[#1e3a8a]">
                                            {form.details.reportTitle ||
                                                documentLabel}
                                        </h1>
                                        <p className="mt-1 text-sm text-[#6a7282]">
                                            {documentLabel} ·{' '}
                                            {form.details.agency} ·{' '}
                                            {form.details.reportingYear}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 text-xs font-semibold">
                                        <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-[#1e3a8a]">
                                            {
                                                repositoryStatusLabels[
                                                    item.status
                                                ]
                                            }
                                        </span>
                                        <DocumentSyncStatus state={sync.state} />
                                    </div>
                                </div>
                            </header>
                            {message ? (
                                <div className="mt-4 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1e3a8a]">
                                    {message}
                                </div>
                            ) : null}
                            {!editable ? (
                                <div className="mt-4 rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
                                    {lockMessage(item)}
                                </div>
                            ) : null}
                            <div className="mt-5 grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
                                <nav className="space-y-1 rounded-[14px] border border-[#e5e7eb] bg-white p-3 xl:sticky xl:top-[88px]">
                                    {sections.map(([id, label], index) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => {
                                                setActiveSection(id);
                                                document
                                                    .getElementById(id)
                                                    ?.scrollIntoView({
                                                        behavior: 'smooth',
                                                    });
                                            }}
                                            className={`flex w-full gap-2 rounded-[10px] px-3 py-2 text-left text-xs font-semibold ${activeSection === id ? 'bg-[#eff6ff] text-[#1e3a8a]' : 'text-[#6a7282] hover:bg-[#f9fafb]'}`}
                                        >
                                            <span>{index + 1}.</span>
                                            {label}
                                        </button>
                                    ))}
                                </nav>
                                <div className="space-y-5">
                                    <ReportSection
                                        id="report-details"
                                        title="Project & Report Details"
                                        description="Core project dates, reporting period, and canonical report identity."
                                    >
                                        <DetailsSection
                                            data={form}
                                            documentTypeLabel={documentLabel}
                                            disabled={!editable}
                                            errors={errors}
                                            onChange={change}
                                        />
                                    </ReportSection>
                                    <ReportSection
                                        id="report-metadata"
                                        title="Research Metadata & AI"
                                        description="Saved metadata remains authoritative until an individual suggestion is applied."
                                    >
                                        <MetadataSection
                                            data={form}
                                            suggestions={suggestions}
                                            processingStatus={processingStatus}
                                            disabled={!editable}
                                            onChange={change}
                                        />
                                        {errors.metadata ||
                                        errors.publicMetadata ? (
                                            <p className="mt-3 text-xs font-medium text-[#dc2626]">
                                                {errors.metadata ??
                                                    errors.publicMetadata}
                                            </p>
                                        ) : null}
                                    </ReportSection>
                                    <ReportSection
                                        id="report-performance"
                                        title="Performance & Accomplishments"
                                        description="Edit persisted performance rows while retaining their identifiers and order."
                                    >
                                        <PerformanceSection
                                            data={form}
                                            disabled={!editable}
                                            errors={errors}
                                            onChange={change}
                                        />
                                    </ReportSection>
                                    <ReportSection
                                        id="report-pap"
                                        title="PAP Classification"
                                        description="Programs, activities, projects, and beneficiary sectors."
                                    >
                                        <PAPSection
                                            data={form}
                                            disabled={!editable}
                                            onChange={change}
                                        />
                                    </ReportSection>
                                    <ReportSection
                                        id="report-financials"
                                        title="Financial Information"
                                        description="Official source amounts remain editable; calculated summaries update reactively."
                                    >
                                        <FinancialSection
                                            data={form}
                                            disabled={!editable}
                                            errors={errors}
                                            onChange={change}
                                        />
                                    </ReportSection>
                                    <ReportSection
                                        id="report-highlights"
                                        title="Project Highlights"
                                        description="Maintain the wizard-supported highlight and its secure attachments."
                                    >
                                        <HighlightsSection
                                            data={form}
                                            disabled={!editable}
                                            uploadBusy={fileBusy}
                                            onChange={change}
                                            onUpload={addHighlightFile}
                                            onRemoveFile={removeAttachment}
                                            onPreviewFile={(fileId) =>
                                                void previewRepositoryFile(
                                                    repositoryId,
                                                    fileId,
                                                ).catch((error) =>
                                                    setMessage(
                                                        apiMessage(
                                                            error,
                                                            'Unable to preview the supporting file.',
                                                        ),
                                                    ),
                                                )
                                            }
                                            onDownloadFile={(
                                                fileId,
                                                fileName,
                                            ) =>
                                                void downloadRepositoryFile(
                                                    repositoryId,
                                                    fileId,
                                                    fileName,
                                                ).catch((error) =>
                                                    setMessage(
                                                        apiMessage(
                                                            error,
                                                            'Unable to download the supporting file.',
                                                        ),
                                                    ),
                                                )
                                            }
                                        />
                                        {allowMultipleHighlights ? (
                                            <AdditionalHighlightsEditor
                                                highlights={
                                                    additionalHighlights
                                                }
                                                disabled={!editable}
                                                uploadBusy={fileBusy}
                                                onChange={(highlights) => {
                                                    setAdditionalHighlights(
                                                        highlights,
                                                    );
                                                    setDirty(true);
                                                    sync.markChanged();
                                                    setMessage(null);
                                                }}
                                                onUpload={(highlight, file) =>
                                                    void addAdditionalHighlightFile(
                                                        highlight,
                                                        file,
                                                    )
                                                }
                                                onRemoveFile={removeAttachment}
                                                onPreviewFile={(fileId) =>
                                                    void previewRepositoryFile(
                                                        repositoryId,
                                                        fileId,
                                                    ).catch((error) =>
                                                        setMessage(
                                                            apiMessage(
                                                                error,
                                                                'Unable to preview the supporting file.',
                                                            ),
                                                        ),
                                                    )
                                                }
                                                onDownloadFile={(
                                                    fileId,
                                                    fileName,
                                                ) =>
                                                    void downloadRepositoryFile(
                                                        repositoryId,
                                                        fileId,
                                                        fileName,
                                                    ).catch((error) =>
                                                        setMessage(
                                                            apiMessage(
                                                                error,
                                                                'Unable to download the supporting file.',
                                                            ),
                                                        ),
                                                    )
                                                }
                                            />
                                        ) : (record.report_highlights ?? [])
                                              .length > 1 ? (
                                            <div className="mt-5 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 text-xs text-[#6a7282]">
                                                Additional persisted highlights
                                                are preserved unchanged.
                                            </div>
                                        ) : null}
                                    </ReportSection>
                                    <ReportSection
                                        id="report-sdgs"
                                        title="SDG Tagging"
                                        description="Manual selections remain unchanged unless AI suggestions are explicitly applied."
                                    >
                                        <SDGSection
                                            data={form}
                                            disabled={!editable}
                                            onChange={change}
                                        />
                                        {errors.sdgs ? (
                                            <p className="mt-3 text-xs font-medium text-[#dc2626]">
                                                {errors.sdgs}
                                            </p>
                                        ) : null}
                                    </ReportSection>
                                    <ReportSection
                                        id="report-files"
                                        title="Document Files"
                                        description={`The newest active ${documentLabel} PDF is primary; prior files remain preserved.`}
                                    >
                                        <FileManager
                                            item={item}
                                            repositoryId={repositoryId}
                                            editable={editable}
                                            busy={fileBusy}
                                            error={errors.files}
                                            replacementRef={replacementRef}
                                            onReplace={replacePdf}
                                            onMessage={setMessage}
                                            documentLabel={documentLabel}
                                        />
                                    </ReportSection>
                                    <ReportSection
                                        id="report-review"
                                        title="Review, Access & History"
                                        description="Review completeness, repository access, and revision information before submission."
                                    >
                                        <ReviewSection
                                            form={form}
                                            item={item}
                                            accessType={accessType}
                                            embargoUntil={embargoUntil}
                                            externalLink={externalLink}
                                            editable={editable}
                                            onAccess={(value) => {
                                                setAccessType(value);
                                                setDirty(true);
                                                sync.markChanged();
                                            }}
                                            onEmbargo={(value) => {
                                                setEmbargoUntil(value);
                                                setDirty(true);
                                                sync.markChanged();
                                            }}
                                            onExternal={(value) => {
                                                setExternalLink(value);
                                                setDirty(true);
                                                sync.markChanged();
                                            }}
                                        />
                                    </ReportSection>
                                </div>
                            </div>
                            <EditDocumentActions
                                isSaving={saving}
                                canEdit={editable}
                                canSubmit={
                                    editable && item.capabilities.canSubmit
                                }
                                isRevisionRequired={
                                    item.status === 'revision-required'
                                }
                                lockedMessage={
                                    editable ? undefined : lockMessage(item)
                                }
                                onSave={() => void save(false)}
                                onSaveDraft={() => void save(false)}
                                onPublish={() => void save(true)}
                                onArchive={() => void archive()}
                                canCreateRevision={item.status === 'published'}
                                onCreateRevision={() => void createRevision()}
                            />
                        </>
                    )}
                </div>
            </main>
        </AgencyAdminLayout>
    );
}

function AdditionalHighlightsEditor({
    highlights,
    disabled,
    uploadBusy,
    onChange,
    onUpload,
    onRemoveFile,
    onPreviewFile,
    onDownloadFile,
}: {
    highlights: AgencyResearchHighlight[];
    disabled: boolean;
    uploadBusy: boolean;
    onChange: (highlights: AgencyResearchHighlight[]) => void;
    onUpload: (highlight: AgencyResearchHighlight, file: File) => void;
    onRemoveFile: (fileId: string) => void;
    onPreviewFile: (fileId: string) => void;
    onDownloadFile: (fileId: string, fileName: string) => void;
}) {
    const update = (index: number, patch: Partial<AgencyResearchHighlight>) =>
        onChange(
            highlights.map((highlight, currentIndex) =>
                currentIndex === index ? { ...highlight, ...patch } : highlight,
            ),
        );

    return (
        <div className="mt-5 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-[#101828]">
                        Additional Highlights
                    </p>
                    <p className="mt-1 text-xs text-[#6a7282]">
                        Add or edit separately persisted PAR highlights.
                    </p>
                </div>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                        onChange([
                            ...highlights,
                            {
                                title: '',
                                description: '',
                                is_featured: false,
                                sort_order: highlights.length + 1,
                                files: [],
                            },
                        ])
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#bfdbfe] bg-white px-3 text-xs font-semibold text-[#1e3a8a] disabled:opacity-50"
                >
                    <Plus className="size-4" />
                    Add Highlight
                </button>
            </div>
            <div className="mt-4 space-y-4">
                {highlights.map((highlight, index) => (
                    <div
                        key={highlight.id ?? `new-${index}`}
                        className="space-y-3 rounded-[10px] border border-[#e5e7eb] bg-white p-4"
                    >
                        <div className="flex items-start gap-3">
                            <input
                                value={highlight.title ?? ''}
                                disabled={disabled}
                                placeholder="Highlight title"
                                onChange={(event) =>
                                    update(index, {
                                        title: event.target.value,
                                    })
                                }
                                className="h-10 min-w-0 flex-1 rounded-[10px] border border-[#d1d5dc] px-3 text-sm disabled:bg-[#f3f4f6]"
                            />
                            {!highlight.id ? (
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                        onChange(
                                            highlights.filter(
                                                (_, currentIndex) =>
                                                    currentIndex !== index,
                                            ),
                                        )
                                    }
                                    className="mt-2 text-[#dc2626] disabled:opacity-40"
                                    aria-label="Remove unsaved highlight"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            ) : null}
                        </div>
                        <textarea
                            value={highlight.description ?? ''}
                            disabled={disabled}
                            rows={3}
                            placeholder="Highlight description"
                            onChange={(event) =>
                                update(index, {
                                    description: event.target.value,
                                })
                            }
                            className="w-full rounded-[10px] border border-[#d1d5dc] px-3 py-2 text-sm disabled:bg-[#f3f4f6]"
                        />
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#344054]">
                            <input
                                type="checkbox"
                                checked={highlight.is_featured ?? false}
                                disabled={disabled}
                                onChange={(event) =>
                                    update(index, {
                                        is_featured: event.target.checked,
                                    })
                                }
                            />
                            Featured highlight
                        </label>
                        <div className="space-y-2">
                            {(highlight.files ?? []).map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-xs"
                                >
                                    <span className="truncate">
                                        {file.original_name}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onPreviewFile(String(file.id))
                                            }
                                            aria-label={`Preview ${file.original_name}`}
                                            className="text-[#1e3a8a]"
                                        >
                                            <Eye className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onDownloadFile(
                                                    String(file.id),
                                                    file.original_name,
                                                )
                                            }
                                            aria-label={`Download ${file.original_name}`}
                                            className="text-[#1e3a8a]"
                                        >
                                            <Download className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={disabled || uploadBusy}
                                            onClick={() =>
                                                onRemoveFile(String(file.id))
                                            }
                                            aria-label={`Remove ${file.original_name}`}
                                            className="text-[#dc2626] disabled:opacity-40"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                            disabled={disabled || uploadBusy}
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    onUpload(highlight, file);
                                }

                                event.target.value = '';
                            }}
                            className="block w-full text-xs disabled:opacity-50"
                        />
                        {!highlight.id ? (
                            <p className="text-xs text-[#92400e]">
                                Save changes before attaching a supporting file.
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

function FileManager({
    item,
    repositoryId,
    editable,
    busy,
    error,
    replacementRef,
    onReplace,
    onMessage,
    documentLabel,
}: {
    item: RepositoryItem;
    repositoryId: string;
    editable: boolean;
    busy: boolean;
    error?: string;
    replacementRef: React.RefObject<HTMLInputElement | null>;
    onReplace: (file: File) => void;
    onMessage: (message: string) => void;
    documentLabel: string;
}) {
    return (
        <>
            <input
                ref={replacementRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        onReplace(file);
                    }

                    event.target.value = '';
                }}
            />
            <div className="space-y-3">
                {item.files.map((file, index) => (
                    <div
                        key={file.id ?? file.name}
                        className="flex flex-col gap-3 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:flex-row sm:items-center"
                    >
                        <FileText className="size-6 shrink-0 text-[#1e3a8a]" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#101828]">
                                {file.name}
                            </p>
                            <p className="mt-1 text-xs text-[#6a7282]">
                                {documentLabel} PDF · {file.size} ·{' '}
                                {file.status ?? 'active'} ·{' '}
                                {new Date(file.uploadedAt).toLocaleString()} ·{' '}
                                {index === 0 ? 'Primary' : 'Previous version'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={!file.id}
                                onClick={() =>
                                    file.id &&
                                    void previewRepositoryFile(
                                        repositoryId,
                                        file.id,
                                    ).catch((cause) =>
                                        onMessage(
                                            apiMessage(
                                                cause,
                                                'Unable to preview the PDF.',
                                            ),
                                        ),
                                    )
                                }
                                className="inline-flex h-9 items-center gap-2 rounded-[10px] border bg-white px-3 text-xs font-semibold disabled:opacity-50"
                            >
                                <Eye className="size-4" />
                                Preview
                            </button>
                            <button
                                type="button"
                                disabled={!file.id}
                                onClick={() =>
                                    file.id &&
                                    void downloadRepositoryFile(
                                        repositoryId,
                                        file.id,
                                        file.name,
                                    )
                                }
                                className="inline-flex h-9 items-center gap-2 rounded-[10px] border bg-white px-3 text-xs font-semibold disabled:opacity-50"
                            >
                                <Download className="size-4" />
                                Download
                            </button>
                        </div>
                    </div>
                ))}
                {!item.files.length ? (
                    <p className="rounded-[12px] border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
                        No active {documentLabel} PDF is attached.
                    </p>
                ) : null}
            </div>
            {error ? (
                <p className="mt-3 text-xs font-medium text-[#dc2626]">
                    {error}
                </p>
            ) : null}
            <button
                type="button"
                disabled={!editable || busy}
                onClick={() => replacementRef.current?.click()}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-4 text-sm font-semibold text-[#1e3a8a] disabled:opacity-50"
            >
                {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                ) : (
                    <UploadCloud className="size-4" />
                )}
                Replace PDF
            </button>
        </>
    );
}

function ReviewSection({
    form,
    item,
    accessType,
    embargoUntil,
    externalLink,
    editable,
    onAccess,
    onEmbargo,
    onExternal,
}: {
    form: ReportWorkflowData;
    item: RepositoryItem;
    accessType: RepositoryAccessType;
    embargoUntil: string;
    externalLink: string;
    editable: boolean;
    onAccess: (value: RepositoryAccessType) => void;
    onEmbargo: (value: string) => void;
    onExternal: (value: string) => void;
}) {
    const metadata = [
        form.aiMetadata.extractedMetadata.title,
        form.aiMetadata.extractedMetadata.abstract,
        form.aiMetadata.extractedMetadata.authors.length,
        form.aiMetadata.selectedPublicMetadata.length,
    ].filter(Boolean).length;
    const performance = form.performance.performanceProjects.filter((row) =>
        row.projectName.trim(),
    ).length;
    const financial = [
        form.financials.allocatedBudget,
        form.financials.releasedAmount,
        form.financials.usedBudget,
        form.financials.financialAsOfDate,
    ].filter((value) => value !== null && value !== '').length;

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Metadata completeness', `${metadata}/4`],
                    ['Performance rows', String(performance)],
                    ['Financial fields', `${financial}/4`],
                    [
                        'PDF availability',
                        item.files.length ? 'Available' : 'Missing',
                    ],
                ].map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-[12px] border bg-[#f9fafb] p-3"
                    >
                        <p className="text-xs text-[#6a7282]">{label}</p>
                        <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                    Access Level
                    <select
                        value={accessType}
                        disabled={!editable}
                        onChange={(event) =>
                            onAccess(event.target.value as RepositoryAccessType)
                        }
                        className="mt-2 h-11 w-full rounded-[10px] border px-3 text-sm disabled:bg-[#f3f4f6]"
                    >
                        {Object.entries(repositoryAccessTypeLabels).map(
                            ([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ),
                        )}
                    </select>
                </label>
                {accessType === 'embargo' ? (
                    <label className="text-sm font-semibold">
                        Embargo Until
                        <input
                            type="date"
                            value={embargoUntil}
                            disabled={!editable}
                            onChange={(event) => onEmbargo(event.target.value)}
                            className="mt-2 h-11 w-full rounded-[10px] border px-3 text-sm"
                        />
                    </label>
                ) : null}
                {accessType === 'external-link' ? (
                    <label className="text-sm font-semibold">
                        External URL
                        <input
                            type="url"
                            value={externalLink}
                            disabled={!editable}
                            onChange={(event) => onExternal(event.target.value)}
                            className="mt-2 h-11 w-full rounded-[10px] border px-3 text-sm"
                        />
                    </label>
                ) : null}
            </div>
            <div className="rounded-[12px] border p-4">
                <p className="text-sm font-bold">Revision History</p>
                {item.versions.map((version) => (
                    <div key={version.id} className="mt-3 text-sm">
                        <p className="font-semibold">{version.label}</p>
                        <p className="text-xs text-[#6a7282]">
                            {version.actor} ·{' '}
                            {new Date(version.timestamp).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
