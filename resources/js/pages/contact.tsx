import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    CircleAlert,
    FilePenLine,
    LifeBuoy,
    LockKeyhole,
    Mail,
    MapPin,
    Search,
} from 'lucide-react';
import { useRef, useState } from 'react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import TurnstileWidget from '@/components/public/turnstile-widget';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { submitPublicContactInquiry } from '@/lib/public/contact-service';

const concernOptions = [
    { value: 'general_inquiry', label: 'General Inquiry' },
    { value: 'research_discovery', label: 'Research Discovery' },
    { value: 'access_request_concern', label: 'Access Request Concern' },
    { value: 'metadata_correction', label: 'Metadata Correction' },
    { value: 'technical_issue', label: 'Technical Issue' },
    { value: 'privacy_concern', label: 'Privacy Concern' },
    { value: 'other', label: 'Other' },
] as const;

const validConcernTypes = new Set<string>(
    concernOptions.map((option) => option.value),
);

const captchaEnabled =
    import.meta.env.VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED === 'true';
const captchaSiteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY as
    | string
    | undefined;

type ContactPageProps = {
    contactEnabled?: boolean;
    supportEmail?: string | null;
};

type ContactForm = {
    name: string;
    email: string;
    organization: string;
    concernType: string;
    researchReference: string;
    subject: string;
    message: string;
    website: string;
};

const emptyForm: ContactForm = {
    name: '',
    email: '',
    organization: '',
    concernType: '',
    researchReference: '',
    subject: '',
    message: '',
    website: '',
};

type FieldErrors = Partial<Record<keyof ContactForm | 'captchaToken', string>>;

export default function HelpSupportPage({
    contactEnabled = false,
    supportEmail = null,
}: ContactPageProps) {
    const [form, setForm] = useState<ContactForm>(emptyForm);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const [captchaError, setCaptchaError] = useState<string | null>(null);
    const [captchaResetKey, setCaptchaResetKey] = useState(0);
    const contactForm = useRef<HTMLFormElement>(null);
    const concernSelect = useRef<HTMLSelectElement>(null);

    const updateField = (field: keyof ContactForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };

    const contactSupport = (concernType: string) => {
        updateField('concernType', concernType);
        contactForm.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        window.setTimeout(() => concernSelect.current?.focus(), 350);
    };

    const validate = () => {
        const errors: FieldErrors = {};
        const email = form.email.trim();

        if (!form.name.trim()) {
            errors.name = 'Full name is required.';
        }

        if (!email) {
            errors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Enter a valid email address.';
        }

        if (!validConcernTypes.has(form.concernType)) {
            errors.concernType = 'Select a concern type.';
        }

        if (!form.subject.trim()) {
            errors.subject = 'Subject is required.';
        }

        if (form.message.trim().length < 10) {
            errors.message = 'Message must be at least 10 characters.';
        }

        if (captchaEnabled && !captchaToken) {
            errors.captchaToken = 'Complete the verification challenge.';
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSuccessMessage(null);
        setSubmissionError(null);

        if (!validate() || isSubmitting || !contactEnabled) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await submitPublicContactInquiry({
                name: form.name.trim(),
                email: form.email.trim(),
                organization: form.organization.trim() || undefined,
                concern_type: form.concernType,
                research_reference: form.researchReference.trim() || undefined,
                subject: form.subject.trim(),
                message: form.message.trim(),
                website: form.website,
                captcha_token: captchaEnabled ? captchaToken : undefined,
            });

            setSuccessMessage(response.message);
            setForm(emptyForm);
            setFieldErrors({});
            setCaptchaResetKey((current) => current + 1);
        } catch (error) {
            if (error instanceof ApiError) {
                setFieldErrors(mapApiErrors(error.errors));
            }

            setSubmissionError(
                "We couldn't submit your inquiry at this time. Please try again later.",
            );
            setCaptchaResetKey((current) => current + 1);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Head title="Help & Support | RIKMS">
                <meta
                    name="description"
                    content="Get help with RIKMS research discovery, access requests, metadata corrections, technical concerns, and repository inquiries."
                />
            </Head>

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar />

                <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                    <header>
                        <h1 className="text-[30px] leading-10 font-bold text-[#1e3a8a]">
                            Help &amp; Support
                        </h1>
                        <p className="mt-3 max-w-4xl text-base leading-7 text-[#374151]">
                            Need assistance with RIKMS? Find answers to common
                            questions, learn how to use repository services, or
                            contact the RIKMS support team for additional
                            assistance.
                        </p>
                        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b7280]">
                            For questions concerning a specific research record,
                            the originating agency or institution may be the
                            appropriate point of contact.
                        </p>
                    </header>

                    <section className="mt-10" aria-labelledby="help-heading">
                        <h2
                            id="help-heading"
                            className="text-xl font-bold text-[#1e3a8a]"
                        >
                            How can we help?
                        </h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <SupportCard
                                icon={Search}
                                title="Find Research"
                                description="Search the public RIKMS repository by title, keyword, agency, category, or Sustainable Development Goal."
                                action={
                                    <Link
                                        href="/browse-research"
                                        className="support-action"
                                    >
                                        Browse Research
                                    </Link>
                                }
                            />
                            <SupportCard
                                icon={LockKeyhole}
                                title="Access Requests"
                                description="If a research document has restricted access, use the access request option available on the research record."
                                action={
                                    <Link
                                        href="/browse-research"
                                        className="support-action"
                                    >
                                        Browse Research
                                    </Link>
                                }
                            />
                            <SupportCard
                                icon={FilePenLine}
                                title="Metadata Corrections"
                                description="Found incorrect information in a research record? Report the issue and include the research title or record reference."
                                action={
                                    <button
                                        type="button"
                                        className="support-action"
                                        onClick={() =>
                                            contactSupport(
                                                'metadata_correction',
                                            )
                                        }
                                    >
                                        Contact Support
                                    </button>
                                }
                            />
                            <SupportCard
                                icon={LifeBuoy}
                                title="Technical Support"
                                description="Report difficulties using the public portal, search functions, access request features, or other RIKMS services."
                                action={
                                    <button
                                        type="button"
                                        className="support-action"
                                        onClick={() =>
                                            contactSupport('technical_issue')
                                        }
                                    >
                                        Contact Support
                                    </button>
                                }
                            />
                        </div>
                    </section>

                    <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
                        <section
                            className="space-y-6 lg:col-span-5"
                            aria-labelledby="contact-information-heading"
                        >
                            <div>
                                <h2
                                    id="contact-information-heading"
                                    className="text-xl font-bold text-[#1e3a8a]"
                                >
                                    Contact Information
                                </h2>
                                <div className="mt-5 space-y-4">
                                    <InformationCard icon={Mail} title="Email">
                                        {supportEmail ? (
                                            <a
                                                href={`mailto:${supportEmail}`}
                                                className="break-all text-[#1e3a8a] hover:underline"
                                            >
                                                {supportEmail}
                                            </a>
                                        ) : (
                                            <>
                                                <span>
                                                    [Official RIKMS Support
                                                    Email]
                                                </span>
                                                <span className="mt-1 block text-xs text-[#9ca3af]">
                                                    Administrator configuration
                                                    required
                                                </span>
                                            </>
                                        )}
                                    </InformationCard>
                                    <InformationCard
                                        icon={MapPin}
                                        title="Region"
                                    >
                                        Davao Region, Philippines
                                    </InformationCard>
                                    <InformationCard
                                        icon={BookOpen}
                                        title="Public Records"
                                    >
                                        <Link
                                            href="/browse-research"
                                            className="text-[#1e3a8a] hover:underline"
                                        >
                                            Search the RIKMS Research Repository
                                        </Link>
                                    </InformationCard>
                                </div>
                            </div>

                            <aside className="rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] p-5 text-sm leading-6 text-[#374151]">
                                <h2 className="font-semibold text-[#1e3a8a]">
                                    Agency-specific concerns
                                </h2>
                                <p className="mt-2">
                                    Questions about the research content itself,
                                    authorship, project information, or
                                    institutional approval may need to be
                                    addressed by the agency or institution
                                    responsible for the research record.
                                </p>
                                <Link
                                    href="/browse-research"
                                    className="mt-3 inline-flex font-semibold text-[#1e3a8a] hover:underline"
                                >
                                    Open the research record to view the
                                    responsible agency.
                                </Link>
                            </aside>
                        </section>

                        <form
                            id="contact-support"
                            ref={contactForm}
                            onSubmit={handleSubmit}
                            noValidate
                            className="scroll-mt-24 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] sm:p-8 lg:col-span-7"
                            aria-labelledby="inquiry-heading"
                        >
                            <h2
                                id="inquiry-heading"
                                className="text-xl font-bold text-[#1e3a8a]"
                            >
                                Send an Inquiry
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                                Provide the details of your concern and the
                                appropriate RIKMS administrator can review your
                                inquiry.
                            </p>

                            {!contactEnabled ? (
                                <Alert className="mt-5 border-[#fcd34d] bg-[#fffbeb] text-[#92400e]">
                                    <CircleAlert />
                                    <AlertTitle>
                                        Online submission unavailable
                                    </AlertTitle>
                                    <AlertDescription className="text-[#92400e]">
                                        The official support destination has not
                                        been configured. You may still use the
                                        repository and agency links on this
                                        page.
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            {successMessage ? (
                                <Alert
                                    className="mt-5 border-[#86efac] bg-[#f0fdf4] text-[#166534]"
                                    aria-live="polite"
                                >
                                    <CheckCircle2 />
                                    <AlertTitle>Inquiry submitted</AlertTitle>
                                    <AlertDescription className="text-[#166534]">
                                        {successMessage}
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            {submissionError ? (
                                <Alert
                                    variant="destructive"
                                    className="mt-5 border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                                    aria-live="assertive"
                                >
                                    <CircleAlert />
                                    <AlertTitle>Submission failed</AlertTitle>
                                    <AlertDescription className="text-[#991b1b]">
                                        {submissionError}
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="mt-6 grid gap-5 sm:grid-cols-2">
                                <FormField
                                    id="contact-name"
                                    label="Full Name"
                                    required
                                    error={fieldErrors.name}
                                >
                                    <Input
                                        id="contact-name"
                                        value={form.name}
                                        onChange={(event) =>
                                            updateField(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={150}
                                        autoComplete="name"
                                        aria-invalid={Boolean(fieldErrors.name)}
                                        aria-describedby={errorId(
                                            'contact-name',
                                            fieldErrors.name,
                                        )}
                                    />
                                </FormField>
                                <FormField
                                    id="contact-email"
                                    label="Email Address"
                                    required
                                    error={fieldErrors.email}
                                >
                                    <Input
                                        id="contact-email"
                                        type="email"
                                        value={form.email}
                                        onChange={(event) =>
                                            updateField(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={255}
                                        autoComplete="email"
                                        aria-invalid={Boolean(
                                            fieldErrors.email,
                                        )}
                                        aria-describedby={errorId(
                                            'contact-email',
                                            fieldErrors.email,
                                        )}
                                    />
                                </FormField>
                                <FormField
                                    id="contact-organization"
                                    label="Organization / Institution"
                                    error={fieldErrors.organization}
                                >
                                    <Input
                                        id="contact-organization"
                                        value={form.organization}
                                        onChange={(event) =>
                                            updateField(
                                                'organization',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={255}
                                        autoComplete="organization"
                                        aria-invalid={Boolean(
                                            fieldErrors.organization,
                                        )}
                                    />
                                </FormField>
                                <FormField
                                    id="contact-concern-type"
                                    label="Concern Type"
                                    required
                                    error={fieldErrors.concernType}
                                >
                                    <select
                                        ref={concernSelect}
                                        id="contact-concern-type"
                                        value={form.concernType}
                                        onChange={(event) =>
                                            updateField(
                                                'concernType',
                                                event.target.value,
                                            )
                                        }
                                        aria-invalid={Boolean(
                                            fieldErrors.concernType,
                                        )}
                                        aria-describedby={errorId(
                                            'contact-concern-type',
                                            fieldErrors.concernType,
                                        )}
                                        className="h-9 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
                                    >
                                        <option value="">
                                            Select a concern
                                        </option>
                                        {concernOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            <div className="mt-5 space-y-5">
                                <FormField
                                    id="contact-research-reference"
                                    label="Research Record / Reference"
                                    error={fieldErrors.researchReference}
                                >
                                    <Input
                                        id="contact-research-reference"
                                        value={form.researchReference}
                                        onChange={(event) =>
                                            updateField(
                                                'researchReference',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={500}
                                        placeholder="Research title, record ID, or research page URL"
                                        aria-invalid={Boolean(
                                            fieldErrors.researchReference,
                                        )}
                                    />
                                </FormField>
                                <FormField
                                    id="contact-subject"
                                    label="Subject"
                                    required
                                    error={fieldErrors.subject}
                                >
                                    <Input
                                        id="contact-subject"
                                        value={form.subject}
                                        onChange={(event) =>
                                            updateField(
                                                'subject',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={255}
                                        aria-invalid={Boolean(
                                            fieldErrors.subject,
                                        )}
                                        aria-describedby={errorId(
                                            'contact-subject',
                                            fieldErrors.subject,
                                        )}
                                    />
                                </FormField>
                                <FormField
                                    id="contact-message"
                                    label="Message"
                                    required
                                    error={fieldErrors.message}
                                >
                                    <textarea
                                        id="contact-message"
                                        rows={6}
                                        value={form.message}
                                        onChange={(event) =>
                                            updateField(
                                                'message',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={5000}
                                        aria-invalid={Boolean(
                                            fieldErrors.message,
                                        )}
                                        aria-describedby={errorId(
                                            'contact-message',
                                            fieldErrors.message,
                                        )}
                                        className="w-full resize-y rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 aria-invalid:border-[#b91c1c] aria-invalid:ring-[#b91c1c]/20"
                                    />
                                </FormField>
                            </div>

                            <div
                                className="absolute -left-[10000px] h-px w-px overflow-hidden"
                                aria-hidden="true"
                            >
                                <Label htmlFor="contact-website">Website</Label>
                                <Input
                                    id="contact-website"
                                    name="website"
                                    value={form.website}
                                    onChange={(event) =>
                                        updateField(
                                            'website',
                                            event.target.value,
                                        )
                                    }
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </div>

                            {captchaEnabled && captchaSiteKey ? (
                                <div className="mt-5">
                                    <TurnstileWidget
                                        id="public-contact-captcha"
                                        enabled
                                        siteKey={captchaSiteKey}
                                        action="public_contact"
                                        resetKey={captchaResetKey}
                                        onTokenChange={setCaptchaToken}
                                        onError={setCaptchaError}
                                    />
                                    {fieldErrors.captchaToken ||
                                    captchaError ? (
                                        <p
                                            className="mt-1 text-xs text-[#b91c1c]"
                                            role="alert"
                                        >
                                            {fieldErrors.captchaToken ||
                                                captchaError}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {captchaEnabled && !captchaSiteKey ? (
                                <p
                                    className="mt-5 text-sm text-[#b91c1c]"
                                    role="alert"
                                >
                                    Verification is temporarily unavailable.
                                    Please try again later.
                                </p>
                            ) : null}

                            <p className="mt-6 rounded-[10px] bg-[#f9fafb] p-4 text-xs leading-5 text-[#6b7280]">
                                Information submitted through this form will be
                                used to review and respond to your inquiry.
                                Please do not include passwords, confidential
                                research data, sensitive personal information,
                                or other restricted information.{' '}
                                <Link
                                    href="/privacy-policy"
                                    className="font-semibold text-[#1e3a8a] hover:underline"
                                >
                                    See our Privacy Policy
                                </Link>
                                .
                            </p>

                            <Button
                                type="submit"
                                disabled={
                                    !contactEnabled ||
                                    isSubmitting ||
                                    (captchaEnabled &&
                                        (!captchaSiteKey || !captchaToken))
                                }
                                className="mt-5 h-11 bg-[#1e3a8a] px-6 text-white hover:bg-[#172f70]"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                            </Button>
                        </form>
                    </div>

                    <section
                        className="mt-10 rounded-[14px] border border-[#e5e7eb] bg-white p-6 sm:p-8"
                        aria-labelledby="before-contact-heading"
                    >
                        <h2
                            id="before-contact-heading"
                            className="text-xl font-bold text-[#1e3a8a]"
                        >
                            Before Contacting Support
                        </h2>
                        <div className="mt-5 grid gap-5 md:grid-cols-3">
                            <HelpTip
                                title="Research access"
                                text="If the document is restricted, submit an access request from the research record whenever that option is available."
                            />
                            <HelpTip
                                title="Research corrections"
                                text="Include the research title, agency, or record reference when reporting incorrect metadata."
                            />
                            <HelpTip
                                title="Technical concerns"
                                text="Include what you were trying to do and the page where the problem occurred. Never send passwords or authentication codes."
                            />
                        </div>
                    </section>
                </main>

                <PortalFooter />
            </div>
        </>
    );
}

function SupportCard({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: typeof Search;
    title: string;
    description: string;
    action: React.ReactNode;
}) {
    return (
        <article className="flex min-h-[230px] flex-col rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-sm transition hover:border-[#bfdbfe] hover:shadow-md">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1e3a8a]">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[#1e3a8a]">
                {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                {description}
            </p>
            <div className="mt-auto pt-4 text-sm font-semibold text-[#1e3a8a] [&_.support-action]:rounded [&_.support-action]:hover:underline [&_.support-action]:focus-visible:outline-2 [&_.support-action]:focus-visible:outline-offset-2 [&_.support-action]:focus-visible:outline-[#1e3a8a]">
                {action}
            </div>
        </article>
    );
}

function InformationCard({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof Mail;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <article className="flex gap-4 rounded-[12px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1e3a8a]">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <h3 className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">
                    {title}
                </h3>
                <div className="mt-1 text-sm leading-6 text-[#374151]">
                    {children}
                </div>
            </div>
        </article>
    );
}

function FormField({
    id,
    label,
    required = false,
    error,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-[#374151]">
                {label}{' '}
                {required ? (
                    <span className="text-[#b91c1c]" aria-label="required">
                        *
                    </span>
                ) : null}
            </Label>
            {children}
            {error ? (
                <p
                    id={`${id}-error`}
                    className="text-xs text-[#b91c1c]"
                    role="alert"
                >
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function HelpTip({ title, text }: { title: string; text: string }) {
    return (
        <article>
            <h3 className="text-sm font-semibold text-[#1e3a8a]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6b7280]">{text}</p>
        </article>
    );
}

function errorId(id: string, error?: string) {
    return error ? `${id}-error` : undefined;
}

function mapApiErrors(errors: Record<string, string[] | string>): FieldErrors {
    const fieldMap: Record<string, keyof FieldErrors> = {
        name: 'name',
        email: 'email',
        organization: 'organization',
        concern_type: 'concernType',
        research_reference: 'researchReference',
        subject: 'subject',
        message: 'message',
        captcha_token: 'captchaToken',
    };

    return Object.entries(errors).reduce<FieldErrors>(
        (mapped, [field, messages]) => {
            const target = fieldMap[field];
            const message = Array.isArray(messages) ? messages[0] : messages;

            if (target && message) {
                mapped[target] = message;
            }

            return mapped;
        },
        {},
    );
}
