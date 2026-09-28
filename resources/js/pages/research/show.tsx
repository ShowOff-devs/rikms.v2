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
import TurnstileWidget from '@/components/public/turnstile-widget';
import ResearchEmptyState from '@/components/research/ResearchEmptyState';
import { ApiError } from '@/lib/api-client';
import {
    downloadPublicResearchFile,
    getPublicPlatformSettings,
    getResearchRecord,
    submitPublicAccessRequest,
} from '@/lib/research/research-service';
import type {
    PublicResearchMetadataField,
    ResearchRecord,
} from '@/types/research';

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

const primaryMetadataKeys = new Set(['title', 'abstract', 'authors']);

const optionalText = (value: string) => {
    const trimmed = value.trim();

    return trimmed ? trimmed : undefined;
};

const captchaEnabled =
    import.meta.env.VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED === 'true';
const captchaSiteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY as
    | string
    | undefined;

export default function ResearchDetailPage({
    researchId: providedResearchId,
}: ResearchDetailPageProps) {
    const researchId = useMemo(
        () => providedResearchId ?? getResearchIdFromPath(),
        [providedResearchId],
    );
    const [research, setResearch] = useState<ResearchRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [requestOpen, setRequestOpen] = useState(() =>
        typeof window === 'undefined'
            ? false
            : window.location.hash === '#request-access',
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [accessRequestsEnabled, setAccessRequestsEnabled] = useState(true);
    const [captchaToken, setCaptchaToken] = useState('');
    const [captchaError, setCaptchaError] = useState<string | null>(null);
    const [captchaResetKey, setCaptchaResetKey] = useState(0);
    const [form, setForm] = useState({
        name: '',
        email: '',
        affiliation: '',
        purpose: '',
        message: '',
        website: '',
    });

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getResearchRecord(researchId),
            getPublicPlatformSettings().catch(() => ({
                accessRequestsEnabled: true,
            })),
        ]).then(([record, publicSettings]) => {
            if (!isCurrent) {
                return;
            }

            setResearch(record);
            setAccessRequestsEnabled(publicSettings.accessRequestsEnabled);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [researchId]);

    const canRequestAccess =
        research?.accessLevel === 'restricted' ||
        research?.accessLevel === 'embargo';
    const supplementalPublicMetadata =
        research?.publicMetadata?.filter(
            (field) =>
                !primaryMetadataKeys.has(field.key) && field.value.trim(),
        ) ?? [];

    const handleRequestSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        setFieldErrors({});

        try {
            const purpose = form.purpose.trim();

            await submitPublicAccessRequest(researchId, {
                requester_name: form.name.trim(),
                requester_email: form.email.trim(),
                requester_affiliation: optionalText(form.affiliation),
                requester_purpose: purpose,
                intended_use: purpose,
                message: optionalText(form.message),
                website: form.website,
                captcha_token: captchaEnabled ? captchaToken : undefined,
            });
            setRequestSubmitted(true);
        } catch (error) {
            if (error instanceof ApiError) {
                setSubmitError(submissionErrorMessage(error));
                setFieldErrors(flattenErrors(error.errors));

                setCaptchaResetKey((current) => current + 1);
            } else {
                setSubmitError(
                    'Unable to submit your request. Please try again.',
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = async () => {
        if (!research || isDownloading) {
            return;
        }

        setIsDownloading(true);
        setDownloadError(null);

        try {
            await downloadPublicResearchFile(
                research.public_identifier,
                research.slug ?? research.title,
            );
            setResearch((current) =>
                current
                    ? {
                          ...current,
                          downloads: current.downloads + 1,
                      }
                    : current,
            );
        } catch (error) {
            setDownloadError(
                error instanceof Error
                    ? error.message
                    : 'Unable to download this research file.',
            );
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            <Head title={research?.title ?? 'Research Details'} />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar activeNav="browse-research" />

                <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-14 sm:px-6 sm:pt-8 sm:pb-16">
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
                        <article className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] sm:px-7 sm:py-7 lg:px-8">
                            <div className="flex flex-wrap gap-1.5">
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

                            <h1 className="mt-4 max-w-[1000px] text-2xl leading-8 font-bold text-[#1e3a8a] sm:text-[30px] sm:leading-[38px]">
                                {research.title}
                            </h1>
                            {research.authors.length > 0 ? (
                                <p className="mt-2 max-w-[90ch] text-sm leading-6 text-[#6b7280]">
                                    {research.authors.join(', ')}
                                </p>
                            ) : null}

                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm leading-5 text-[#6b7280]">
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

                            {research.abstract.trim() ? (
                                <section className="mt-7 border-t border-[#e5e7eb] pt-6">
                                    <h2 className="text-base leading-6 font-semibold text-[#1e3a8a]">
                                        Abstract
                                    </h2>
                                    <PublicLongText value={research.abstract} />
                                </section>
                            ) : null}

                            {supplementalPublicMetadata.length > 0 ? (
                                <section className="mt-7 border-t border-[#e5e7eb] pt-6">
                                    <h2 className="text-base leading-6 font-semibold text-[#1e3a8a]">
                                        Public Metadata
                                    </h2>
                                    <div className="mt-4 space-y-5">
                                        {supplementalPublicMetadata.map(
                                            (field) => (
                                                <PublicMetadataItem
                                                    key={field.key}
                                                    field={field}
                                                />
                                            ),
                                        )}
                                    </div>
                                </section>
                            ) : null}

                            <section className="mt-7 border-t border-[#e5e7eb] pt-6">
                                <h2 className="text-base leading-6 font-semibold text-[#1e3a8a]">
                                    Access
                                </h2>
                                {research.accessLevel === 'public' ? (
                                    <div className="mt-4 flex flex-col gap-4 rounded-[12px] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="max-w-[760px] text-sm leading-6 text-[#374151]">
                                            This record is marked for public
                                            download.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={isDownloading}
                                            onClick={handleDownload}
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white sm:self-auto"
                                        >
                                            <Download className="size-4" />
                                            {isDownloading
                                                ? 'Starting...'
                                                : 'Download PDF'}
                                        </button>
                                        {downloadError ? (
                                            <p className="text-sm leading-5 text-[#b91c1c] sm:basis-full">
                                                {downloadError}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                                {research.accessLevel === 'external' &&
                                research.externalUrl ? (
                                    <div className="mt-4 flex flex-col gap-4 rounded-[12px] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="max-w-[760px] text-sm leading-6 text-[#374151]">
                                            This record is hosted by an external
                                            public source.
                                        </p>
                                        <a
                                            href={research.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white sm:self-auto"
                                        >
                                            <ExternalLink className="size-4" />
                                            Open Source
                                        </a>
                                    </div>
                                ) : null}
                                {research.accessLevel === 'restricted' ? (
                                    <div
                                        id="request-access"
                                        className="mt-4 flex flex-col gap-4 rounded-[12px] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <p className="max-w-[760px] text-sm leading-6 text-[#374151]">
                                            {accessRequestsEnabled
                                                ? 'This record requires agency approval before files can be shared.'
                                                : 'Public access requests are currently unavailable.'}
                                        </p>
                                        {accessRequestsEnabled ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRequestOpen(true)
                                                }
                                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white sm:self-auto"
                                            >
                                                <Lock className="size-4" />
                                                Request Access
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                                {research.accessLevel === 'embargo' ? (
                                    <div
                                        id="request-access"
                                        className="mt-4 flex flex-col gap-4 rounded-[12px] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <p className="max-w-[760px] text-sm leading-6 text-[#374151]">
                                            {accessRequestsEnabled
                                                ? `This record is embargoed${research.embargoUntil ? ` until ${research.embargoUntil}` : ''}. You may still submit an access inquiry for agency review.`
                                                : 'Public access requests are currently unavailable.'}
                                        </p>
                                        {accessRequestsEnabled ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRequestOpen(true)
                                                }
                                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white sm:self-auto"
                                            >
                                                <Lock className="size-4" />
                                                Request Access
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </section>
                        </article>
                    ) : null}
                </main>

                <PortalFooter />
            </div>

            {requestOpen &&
            research &&
            canRequestAccess &&
            accessRequestsEnabled ? (
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
                                    <div
                                        className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-3 text-sm leading-5 text-[#991b1b]"
                                        role="alert"
                                        aria-live="polite"
                                    >
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
                                <label
                                    className="absolute top-auto left-[-10000px] h-px w-px overflow-hidden"
                                    aria-hidden="true"
                                >
                                    Website
                                    <input
                                        type="text"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={form.website}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                website: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
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
                                {captchaEnabled && captchaSiteKey ? (
                                    <div>
                                        <TurnstileWidget
                                            id="public-access-request-captcha"
                                            enabled={
                                                requestOpen && captchaEnabled
                                            }
                                            siteKey={captchaSiteKey}
                                            action="public_access_request"
                                            resetKey={captchaResetKey}
                                            onTokenChange={setCaptchaToken}
                                            onError={setCaptchaError}
                                        />
                                        {fieldErrors.captcha_token ? (
                                            <span className="mt-1 block text-xs leading-4 text-[#b91c1c]">
                                                {fieldErrors.captcha_token}
                                            </span>
                                        ) : null}
                                        {captchaError ? (
                                            <span className="mt-1 block text-xs leading-4 text-[#b91c1c]">
                                                {captchaError}
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}
                                {captchaEnabled && !captchaSiteKey ? (
                                    <p className="text-sm text-[#b91c1c]">
                                        Verification is temporarily unavailable.
                                        Please try again later.
                                    </p>
                                ) : null}
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
                                        disabled={
                                            isSubmitting ||
                                            (captchaEnabled && !captchaToken)
                                        }
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

function PublicLongText({ value }: { value: string }) {
    const paragraphs = value
        .trim()
        .split(/\n+/u)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    return (
        <div className="mt-3 w-full space-y-4 text-[15px] leading-7 text-[#374151]">
            {paragraphs.map((paragraph, index) => (
                <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className="hyphens-auto"
                    style={{ textAlign: 'justify' }}
                >
                    {paragraph}
                </p>
            ))}
        </div>
    );
}

function PublicMetadataItem({ field }: { field: PublicResearchMetadataField }) {
    const value = field.value.trim();

    if (field.key === 'keywords') {
        const keywords = value
            .split(/[,;]+/u)
            .map((keyword) => keyword.trim())
            .filter(Boolean);

        return (
            <div>
                <p className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">
                    {field.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                        <span
                            key={keyword}
                            className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#1e3a8a]"
                        >
                            {keyword}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <p className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">
                {field.label}
            </p>
            <PublicLongText value={value} />
        </div>
    );
}

function flattenErrors(errors: ApiError['errors']) {
    const fieldMap: Record<string, string> = {
        requester_name: 'name',
        requester_email: 'email',
        requester_affiliation: 'affiliation',
        requester_purpose: 'purpose',
        intended_use: 'purpose',
        captcha_token: 'captcha_token',
        website: 'website',
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

function submissionErrorMessage(error: ApiError) {
    if (error.status === 409) {
        return 'You already have an active request for this research record.';
    }

    if (error.status === 429) {
        return 'Too many requests have been submitted. Please wait and try again later.';
    }

    if (error.errors.captcha_token) {
        return 'We could not verify the submission. Please try again.';
    }

    if (error.status === 422) {
        return 'Please check the submitted fields and try again.';
    }

    return error.message || 'Unable to submit your request. Please try again.';
}
