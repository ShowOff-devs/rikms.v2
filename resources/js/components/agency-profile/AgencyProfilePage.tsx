import { zodResolver } from '@hookform/resolvers/zod';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { AgencyInformationForm } from '@/components/agency-profile/AgencyInformationForm';
import { AgencyLogoSection } from '@/components/agency-profile/AgencyLogoSection';
import { AgencyProfileActions } from '@/components/agency-profile/AgencyProfileActions';
import { AgencyProfilePreview } from '@/components/agency-profile/AgencyProfilePreview';
import { AgencyQuickLinks } from '@/components/agency-profile/AgencyQuickLinks';
import { AgencyResearchSummary } from '@/components/agency-profile/AgencyResearchSummary';
import {
    getAgencyProfile,
    removeAgencyLogo,
    updateAgencyProfile,
    uploadAgencyLogo,
} from '@/lib/agency-profile/agency-profile-service';
import { useAgencySession } from '@/lib/auth/agency-auth';
import type {
    AgencyLogoState,
    AgencyProfile,
    AgencyProfileFormValues,
} from '@/types/agency-profile';

const maxLogoFileSize = 5 * 1024 * 1024;
const validLogoTypes = ['image/png', 'image/svg+xml', 'image/jpeg'];

const agencyProfileSchema = z.object({
    agencyName: z.string().trim().min(1, 'Agency Name is required.'),
    agencyShortName: z.string().trim().min(1, 'Agency Short Name is required.'),
    agencyDescription: z
        .string()
        .trim()
        .min(1, 'Agency Description is required.')
        .max(500, 'Agency Description must be 500 characters or fewer.'),
    agencyWebsite: z
        .string()
        .trim()
        .min(1, 'Agency Website is required.')
        .url('Enter a valid website URL.'),
    agencyContactEmail: z
        .string()
        .trim()
        .min(1, 'Agency Contact Email is required.')
        .email('Enter a valid email address.'),
    agencyOfficeAddress: z
        .string()
        .trim()
        .min(1, 'Agency Office Address is required.'),
});

const emptyFormValues: AgencyProfileFormValues = {
    agencyName: '',
    agencyShortName: '',
    agencyDescription: '',
    agencyWebsite: '',
    agencyContactEmail: '',
    agencyOfficeAddress: '',
};

const emptyLogoState: AgencyLogoState = {
    logoFile: null,
    logoUploadStatus: 'idle',
};

export function AgencyProfilePage() {
    const session = useAgencySession();
    const [search, setSearch] = useState('');
    const [profile, setProfile] = useState<AgencyProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [saveError, setSaveError] = useState('');
    const [logoState, setLogoState] = useState<AgencyLogoState>(emptyLogoState);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isDirty },
    } = useForm<AgencyProfileFormValues>({
        resolver: zodResolver(agencyProfileSchema),
        mode: 'onChange',
        defaultValues: emptyFormValues,
    });

    const watchedValues = watch();
    const descriptionLength = watchedValues.agencyDescription?.length ?? 0;
    const logoDirty = Boolean(
        profile &&
        (logoState.logoFile ||
            (logoState.logoUrl ?? '') !== (profile.logoUrl ?? '')),
    );
    const hasChanges = isDirty || logoDirty;
    const hasValidationErrors = Object.keys(errors).length > 0;
    const canSave = hasChanges && !hasValidationErrors && !isSaving;

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        if (!session) {
            return;
        }

        let isCurrent = true;

        getAgencyProfile(session.agencyId).then((agencyProfile) => {
            if (!isCurrent) {
                return;
            }

            setProfile(agencyProfile);

            if (agencyProfile) {
                reset(profileToFormValues(agencyProfile));
                setLogoState({
                    logoFile: null,
                    logoUrl: agencyProfile.logoUrl,
                    logoUploadStatus: 'idle',
                });
            }

            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [reset, session]);

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const handleLogoSelected = async (file: File) => {
        setFeedback('');
        setSaveError('');

        if (!validLogoTypes.includes(file.type)) {
            setLogoState((current) => ({
                ...current,
                logoFile: null,
                logoPreviewUrl: undefined,
                logoUploadStatus: 'error',
                error: 'Please upload a PNG, SVG, JPG, or JPEG logo file.',
            }));

            return;
        }

        if (file.size > maxLogoFileSize) {
            setLogoState((current) => ({
                ...current,
                logoFile: null,
                logoPreviewUrl: undefined,
                logoUploadStatus: 'error',
                error: 'Logo file size must be 5 MB or smaller.',
            }));

            return;
        }

        const logoPreviewUrl = await readLogoPreview(file);

        setLogoState((current) => ({
            ...current,
            logoFile: file,
            logoPreviewUrl,
            logoUploadStatus: 'selected',
            error: undefined,
        }));
    };

    const handleRemoveLogo = () => {
        setFeedback('');
        setSaveError('');
        setLogoState({
            logoFile: null,
            logoUrl: undefined,
            logoPreviewUrl: undefined,
            logoUploadStatus: 'removed',
        });
    };

    const handleCancel = () => {
        if (!profile) {
            return;
        }

        reset(profileToFormValues(profile));
        setLogoState({
            logoFile: null,
            logoUrl: profile.logoUrl,
            logoPreviewUrl: undefined,
            logoUploadStatus: 'idle',
        });
        setFeedback('');
        setSaveError('');
    };

    const handleSave = async (values: AgencyProfileFormValues) => {
        if (!profile || !hasChanges) {
            return;
        }

        setIsSaving(true);
        setFeedback('');
        setSaveError('');

        try {
            let nextLogoUrl = logoState.logoUrl;

            if (logoState.logoFile) {
                setLogoState((current) => ({
                    ...current,
                    logoUploadStatus: 'uploading',
                }));

                const uploadResult = await uploadAgencyLogo(logoState.logoFile);
                nextLogoUrl = uploadResult.logoUrl;
            } else if (!logoState.logoUrl && profile.logoUrl) {
                await removeAgencyLogo();
                nextLogoUrl = undefined;
            }

            const updatedProfile = await updateAgencyProfile({
                ...values,
                logoUrl: nextLogoUrl,
            });

            setProfile(updatedProfile);
            reset(profileToFormValues(updatedProfile));
            setLogoState({
                logoFile: null,
                logoUrl: updatedProfile.logoUrl,
                logoPreviewUrl: undefined,
                logoUploadStatus: logoState.logoFile ? 'uploaded' : 'idle',
            });
            setFeedback('Agency profile changes have been saved.');
        } catch (error) {
            setSaveError(
                error instanceof Error
                    ? error.message
                    : 'Unable to save agency profile changes.',
            );
            setLogoState((current) => ({
                ...current,
                logoUploadStatus: 'error',
            }));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Head title="Agency Profile" />

            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <main className="px-4 py-8 lg:px-14">
                    <div className="mx-auto max-w-[1200px]">
                        <nav className="flex h-5 items-center gap-1.5 text-sm leading-5">
                            <Link
                                href="/agency/dashboard"
                                className="text-[#6a7282] hover:text-[#1e3a8a]"
                            >
                                Agency
                            </Link>
                            <ChevronRight className="size-3.5 text-[#6a7282]" />
                            <span className="font-medium text-[#1e3a8a]">
                                Agency Profile
                            </span>
                        </nav>

                        <header className="mt-5">
                            <h1 className="text-2xl leading-9 font-bold text-[#1e3a8a]">
                                Agency Profile
                            </h1>
                            <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                                Manage your agency&apos;s information displayed
                                in the RIKMS research portal.
                            </p>
                        </header>

                        {feedback ? (
                            <div
                                role="status"
                                className="mt-5 rounded-[10px] border border-[#b9f8cf] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#008236]"
                            >
                                {feedback}
                            </div>
                        ) : null}

                        {saveError ? (
                            <div
                                role="alert"
                                className="mt-5 rounded-[10px] border border-[#ffc9c9] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#e7000b]"
                            >
                                {saveError}
                            </div>
                        ) : null}

                        {isLoading ? (
                            <AgencyProfileLoadingState />
                        ) : profile ? (
                            <section className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,816px)_minmax(300px,1fr)]">
                                <div className="space-y-6">
                                    <AgencyLogoSection
                                        logoState={logoState}
                                        onLogoSelected={handleLogoSelected}
                                        onRemoveLogo={handleRemoveLogo}
                                    />
                                    <AgencyInformationForm
                                        register={register}
                                        errors={errors}
                                        descriptionLength={descriptionLength}
                                        onSubmit={handleSubmit(handleSave)}
                                    />
                                    <AgencyProfileActions
                                        hasChanges={hasChanges}
                                        isSaving={isSaving}
                                        canSave={canSave}
                                        onCancel={handleCancel}
                                    />
                                </div>

                                <aside className="space-y-5 xl:sticky xl:top-[88px]">
                                    <AgencyProfilePreview
                                        values={watchedValues}
                                        logoState={logoState}
                                    />
                                    <AgencyResearchSummary
                                        summary={profile.researchSummary}
                                    />
                                    <AgencyQuickLinks
                                        agencySlug={profile.slug}
                                    />
                                </aside>
                            </section>
                        ) : (
                            <AgencyProfileFallbackState />
                        )}
                    </div>
                </main>
            </AgencyAdminLayout>
        </>
    );
}

function profileToFormValues(profile: AgencyProfile): AgencyProfileFormValues {
    return {
        agencyName: profile.name,
        agencyShortName: profile.shortName,
        agencyDescription: profile.description,
        agencyWebsite: profile.website,
        agencyContactEmail: profile.contactEmail,
        agencyOfficeAddress: profile.officeAddress,
    };
}

function readLogoPreview(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to preview logo.'));
        reader.readAsDataURL(file);
    });
}

function AgencyProfileLoadingState() {
    return (
        <section className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,816px)_minmax(300px,1fr)]">
            <div className="space-y-6">
                <div className="h-[208px] animate-pulse rounded-[14px] bg-white" />
                <div className="h-[606px] animate-pulse rounded-[14px] bg-white" />
                <div className="h-[84px] animate-pulse rounded-[14px] bg-white" />
            </div>
            <div className="space-y-5">
                <div className="h-[300px] animate-pulse rounded-[14px] bg-white" />
                <div className="h-[252px] animate-pulse rounded-[14px] bg-white" />
                <div className="h-[171px] animate-pulse rounded-[14px] bg-white" />
            </div>
        </section>
    );
}

function AgencyProfileFallbackState() {
    return (
        <div className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-10 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="text-base font-semibold text-[#1e3a8a]">
                Agency profile unavailable
            </h2>
            <p className="mt-2 text-sm leading-5 text-[#6a7282]">
                No agency profile was found for the current Agency Admin
                session.
            </p>
        </div>
    );
}
