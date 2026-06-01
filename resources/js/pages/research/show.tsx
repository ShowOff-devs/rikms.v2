import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Calendar,
    Download,
    ExternalLink,
    Lock,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import ResearchEmptyState from '@/components/research/ResearchEmptyState';
import { ApiError } from '@/lib/api-client';
import {
    getResearchRecord,
    submitPublicAccessRequest,
} from '@/lib/research/research-service';
import type { ResearchRecord } from '@/types/research';

type ResearchDetailPageProps = {
    researchId?: string;
};

const getResearchIdFromPath = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return decodeURIComponent(window.location.pathname.split('/').pop() ?? '');
};

const accessLabels = {
    public: 'Public Download',
    restricted: 'Restricted',
    embargo: 'Embargoed',
    external: 'External Source',
} as const;

export default function ResearchDetailPage({
    researchId: providedResearchId,
}: ResearchDetailPageProps) {
    const researchId = useMemo(
        () => providedResearchId ?? getResearchIdFromPath(),
        [providedResearchId],
    );
    const [research, setResearch] = useState<ResearchRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [requestOpen, setRequestOpen] = useState(() =>
        typeof window === 'undefined'
            ? false
            : window.location.hash === '#request-access',
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        name: '',
        email: '',
        affiliation: '',
        purpose: '',
        message: '',
    });

    useEffect(() => {
        let isCurrent = true;

        getResearchRecord(researchId).then((record) => {
            if (!isCurrent) {
                return;
            }

            setResearch(record);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [researchId]);

    const canRequestAccess =
        research?.accessLevel === 'restricted' ||
        research?.accessLevel === 'embargo';

    const handleRequestSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        setFieldErrors({});

        try {
            await submitPublicAccessRequest(researchId, {
                requester_name: form.name,
                requester_email: form.email,
                requester_affiliation: form.affiliation || undefined,
                requester_purpose: form.purpose,
                message: form.message || undefined,
            });
            setRequestSubmitted(true);
        } catch (error) {
            if (error instanceof ApiError) {
                setSubmitError(error.message);
                setFieldErrors(flattenErrors(error.errors));
            } else {
                setSubmitError(
                    'Unable to submit your request. Please try again.',
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Head title={research?.title ?? 'Research Details'} />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar activeNav="browse-research" />

                <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
                    <Link
                        href="/browse-research"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#1e3a8a] hover:underline"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Browse Research
                    </Link>

                    {isLoading ? (
                        <div className="mt-6 h-[360px] animate-pulse rounded-[14px] border border-[#f3f4f6] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />
                    ) : null}

                    {!isLoading && !research ? (
                        <div className="mt-6">
                            <ResearchEmptyState
                                title="Research record not found"
                                description="The selected research record may have been moved, archived, or made unavailable."
                                actionLabel="Return to research list"
                                onAction={() => {
                                    window.location.href = '/browse-research';
                                }}
                            />
                        </div>
                    ) : null}

                    {!isLoading && research ? (
                        <article className="mt-6 rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-wrap gap-2">
                                {research.tags.map((tag) => (
                                    <span
                                        key={tag.label}
                                        className={
                                            tag.type === 'category'
                                                ? 'rounded-full px-2 py-0.5 text-xs leading-4 text-[#6b7280]'
                                                : 'rounded-full px-2 py-0.5 text-xs leading-4 font-medium text-white'
                                        }
                                        style={{ backgroundColor: tag.color }}
                                    >
                                        {tag.label}
                                    </span>
                                ))}
                                <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-xs leading-4 font-medium text-[#1d4ed8]">
                                    {accessLabels[research.accessLevel]}
                                </span>
                            </div>

                            <h1 className="mt-3 max-w-[900px] text-[28px] leading-9 font-bold text-[#1e3a8a]">
                                {research.title}
                            </h1>
                            <p className="mt-2 text-sm leading-5 text-[#6b7280]">
                                {research.authors.join(', ')}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm leading-5 text-[#6b7280]">
                                <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="size-4" />
                                    {research.agency}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="size-4" />
                                    {research.publicationYear}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Download className="size-4" />
                                    {new Intl.NumberFormat('en-US').format(
                                        research.downloads,
                                    )}{' '}
                                    downloads
                                </span>
                            </div>

                            <section className="mt-6 border-t border-[#f3f4f6] pt-6">
                                <h2 className="text-base leading-6 font-semibold text-[#1e3a8a]">
                                    Abstract
                                </h2>
                                <p className="mt-2 max-w-[900px] text-sm leading-6 text-[#374151]">
                                    {research.abstract}
                                </p>
                            </section>

                            <section className="mt-6 border-t border-[#f3f4f6] pt-6">
                                <h2 className="text-base leading-6 font-semibold text-[#1e3a8a]">
                                    Access
                                </h2>
                                {research.accessLevel === 'public' ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <p className="text-sm text-[#374151]">
                                            This record is marked for public
                                            download.
                                        </p>
                                        <button
                                            type="button"
                                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
                                        >
                                            <Download className="size-4" />
                                            Download PDF
                                        </button>
                                    </div>
                                ) : null}
                                {research.accessLevel === 'external' &&
                                research.externalUrl ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <p className="text-sm text-[#374151]">
                                            This record is hosted by an external
                                            public source.
                                        </p>
                                        <a
                                            href={research.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
                                        >
                                            <ExternalLink className="size-4" />
                                            Open Source
                                        </a>
                                    </div>
                                ) : null}
                                {research.accessLevel === 'restricted' ? (
                                    <div
                                        id="request-access"
                                        className="mt-3 flex flex-wrap items-center gap-3"
                                    >
                                        <p className="text-sm text-[#374151]">
                                            This record requires agency approval
                                            before files can be shared.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRequestOpen(true)}
                                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
                                        >
                                            <Lock className="size-4" />
                                            Request Access
                                        </button>
                                    </div>
                                ) : null}
                                {research.accessLevel === 'embargo' ? (
                                    <div
                                        id="request-access"
                                        className="mt-3 flex flex-wrap items-center gap-3"
                                    >
                                        <p className="text-sm text-[#374151]">
                                            This record is embargoed
                                            {research.embargoUntil
                                                ? ` until ${research.embargoUntil}`
                                                : ''}
                                            . You may still submit an access
                                            inquiry for agency review.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRequestOpen(true)}
                                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white"
                                        >
                                            <Lock className="size-4" />
                                            Request Access
                                        </button>
                                    </div>
                                ) : null}
                            </section>
                        </article>
                    ) : null}
                </main>

                <PortalFooter />
            </div>

            {requestOpen && research && canRequestAccess ? (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="request-access-title"
                >
                    <div className="w-full max-w-[560px] rounded-[14px] bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="request-access-title"
                                    className="text-lg font-semibold text-[#1e3a8a]"
                                >
                                    Request Access
                                </h2>
                                <p className="mt-1 text-sm text-[#6b7280]">
                                    {research.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRequestOpen(false)}
                                className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[#e5e7eb] text-[#6b7280]"
                                aria-label="Close request access form"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {requestSubmitted ? (
                            <div className="mt-6 rounded-[12px] bg-[#ecfdf5] p-4 text-sm leading-6 text-[#047857]">
                                Your request was submitted for agency review.
                            </div>
                        ) : (
                            <form
                                className="mt-6 space-y-4"
                                onSubmit={handleRequestSubmit}
                            >
                                {submitError ? (
                                    <div className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-3 text-sm leading-5 text-[#991b1b]">
                                        {submitError}
                                    </div>
                                ) : null}
                                {[
                                    ['name', 'Requester name'],
                                    ['email', 'Email address'],
                                    ['affiliation', 'Affiliation'],
                                ].map(([field, label]) => (
                                    <label
                                        key={field}
                                        className="block text-sm font-medium text-[#374151]"
                                    >
                                        {label}
                                        <input
                                            required={field !== 'affiliation'}
                                            aria-required={
                                                field !== 'affiliation'
                                            }
                                            type={
                                                field === 'email'
                                                    ? 'email'
                                                    : 'text'
                                            }
                                            value={
                                                form[field as keyof typeof form]
                                            }
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    [field]: event.target.value,
                                                }))
                                            }
                                            className="mt-1 h-10 w-full rounded-[10px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                        />
                                        {fieldErrors[field] ? (
                                            <span className="mt-1 block text-xs leading-4 text-[#b91c1c]">
                                                {fieldErrors[field]}
                                            </span>
                                        ) : null}
                                    </label>
                                ))}
                                <label className="block text-sm font-medium text-[#374151]">
                                    Purpose
                                    <textarea
                                        required
                                        rows={4}
                                        value={form.purpose}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                purpose: event.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                    />
                                    {fieldErrors.purpose ? (
                                        <span className="mt-1 block text-xs leading-4 text-[#b91c1c]">
                                            {fieldErrors.purpose}
                                        </span>
                                    ) : null}
                                </label>
                                <label className="block text-sm font-medium text-[#374151]">
                                    Message
                                    <textarea
                                        rows={3}
                                        value={form.message}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                message: event.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                    />
                                    {fieldErrors.message ? (
                                        <span className="mt-1 block text-xs leading-4 text-[#b91c1c]">
                                            {fieldErrors.message}
                                        </span>
                                    ) : null}
                                </label>
                                <div className="flex flex-wrap justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRequestOpen(false)}
                                        className="inline-flex h-10 items-center rounded-[10px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#374151]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex h-10 items-center rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting
                                            ? 'Submitting...'
                                            : 'Submit request'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}

function flattenErrors(errors: ApiError['errors']) {
    const fieldMap: Record<string, string> = {
        requester_name: 'name',
        requester_email: 'email',
        requester_affiliation: 'affiliation',
        requester_purpose: 'purpose',
    };

    return Object.entries(errors).reduce<Record<string, string>>(
        (current, [key, value]) => {
            const field = fieldMap[key] ?? key;
            current[field] = Array.isArray(value) ? value[0] : value;

            return current;
        },
        {},
    );
}
