import { zodResolver } from '@hookform/resolvers/zod';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { AccountSettingsPanel } from '@/components/settings/AccountSettingsPanel';
import { DeactivateAccountModal } from '@/components/settings/DeactivateAccountModal';
import { NotificationSettingsPanel } from '@/components/settings/NotificationSettingsPanel';
import { SecuritySettingsPanel } from '@/components/settings/SecuritySettingsPanel';
import { SettingsSaveButton } from '@/components/settings/SettingsSaveButton';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { getAgencySession } from '@/lib/auth/agency-auth';
import {
    changePassword,
    getAgencySettings,
    requestAccountDeactivation,
    updateAccountSettings,
    updateNotificationSettings,
    updateSecuritySettings,
    uploadProfilePhoto,
} from '@/lib/settings/settings-service';
import type { AgencyAuthSession } from '@/types/auth';
import type {
    AccountSettings,
    AgencySettings,
    DeactivationRequestStatus,
    NotificationSettings,
    PasswordChangePayload,
    SecuritySettings,
    SettingsTab,
} from '@/types/settings';

const emptyAccount: AccountSettings = {
    fullName: '',
    emailAddress: '',
    role: '',
    agency: '',
};

const emptyNotifications: NotificationSettings = {
    notifyNewAccessRequests: false,
    notifyRequestApprovalsDenials: false,
    notifyNewResearchUploads: false,
    browserNotifications: false,
    weeklyDigest: false,
    monthlyAnalyticsReport: false,
};

const emptySecurity: SecuritySettings = {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    activeSessions: [],
};

const emptyPassword: PasswordChangePayload = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
};

const validPhotoTypes = ['image/png', 'image/svg+xml', 'image/jpeg'];

const accountSchema = z.object({
    fullName: z.string().trim().min(1, 'Full Name is required.'),
    emailAddress: z
        .string()
        .trim()
        .min(1, 'Email Address is required.')
        .email('Enter a valid email address.'),
    role: z.string(),
    agency: z.string(),
    profilePhotoUrl: z.string().optional(),
});

const passwordSchema = z
    .object({
        currentPassword: z
            .string()
            .trim()
            .min(1, 'Current password is required.'),
        newPassword: z
            .string()
            .min(8, 'New password must be at least 8 characters.'),
        confirmNewPassword: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmNewPassword, {
        path: ['confirmNewPassword'],
        message: 'Confirm password must match the new password.',
    });

const securitySchema = z.object({
    twoFactorEnabled: z.boolean(),
    sessionTimeout: z
        .number()
        .int('Session timeout must be a whole number.')
        .min(5, 'Session timeout must be at least 5 minutes.')
        .max(240, 'Session timeout must be 240 minutes or fewer.'),
    activeSessions: z.array(z.unknown()),
});

export function AgencySettingsPage() {
    useForm({
        resolver: zodResolver(accountSchema),
    });

    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<SettingsTab>('account');
    const [settings, setSettings] = useState<AgencySettings | null>(null);
    const [account, setAccount] = useState<AccountSettings>(emptyAccount);
    const [password, setPassword] =
        useState<PasswordChangePayload>(emptyPassword);
    const [notifications, setNotifications] =
        useState<NotificationSettings>(emptyNotifications);
    const [security, setSecurity] = useState<SecuritySettings>(emptySecurity);
    const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
    const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState<
        string | undefined
    >();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState('');
    const [saveError, setSaveError] = useState('');
    const [deactivationModalOpen, setDeactivationModalOpen] = useState(false);
    const [deactivationStatus, setDeactivationStatus] =
        useState<DeactivationRequestStatus>('idle');

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

        getAgencySettings().then((loadedSettings) => {
            if (!isCurrent) {
                return;
            }

            setSettings(loadedSettings);
            setAccount(loadedSettings.account);
            setNotifications(loadedSettings.notifications);
            setSecurity(loadedSettings.security);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [session]);

    const hasPasswordChange = Object.values(password).some(Boolean);
    const dirtyTabs = useMemo(
        () => ({
            account:
                Boolean(settings) &&
                (JSON.stringify(account) !==
                    JSON.stringify(settings?.account) ||
                    Boolean(profilePhotoFile) ||
                    hasPasswordChange),
            notifications:
                Boolean(settings) &&
                JSON.stringify(notifications) !==
                    JSON.stringify(settings?.notifications),
            security:
                Boolean(settings) &&
                JSON.stringify(security) !== JSON.stringify(settings?.security),
        }),
        [
            account,
            hasPasswordChange,
            notifications,
            profilePhotoFile,
            security,
            settings,
        ],
    );
    const canSave = Boolean(dirtyTabs[activeTab]) && !isSaving && !isLoading;

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const handleAccountChange = (
        field: keyof AccountSettings,
        value: string,
    ) => {
        clearFieldError(field);
        setFeedback('');
        setSaveError('');
        setAccount((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handlePasswordChange = (
        field: keyof PasswordChangePayload,
        value: string,
    ) => {
        clearFieldError(field);
        setFeedback('');
        setSaveError('');
        setPassword((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handlePhotoSelected = async (file: File) => {
        setFeedback('');
        setSaveError('');
        clearFieldError('profilePhoto');

        if (!validPhotoTypes.includes(file.type)) {
            setErrors((current) => ({
                ...current,
                profilePhoto: 'Please upload a PNG, SVG, JPG, or JPEG image.',
            }));
            setProfilePhotoFile(null);
            setProfilePhotoPreviewUrl(undefined);

            return;
        }

        setProfilePhotoFile(file);
        setProfilePhotoPreviewUrl(await readFilePreview(file));
    };

    const handleNotificationChange = (
        field: keyof NotificationSettings,
        value: boolean,
    ) => {
        setFeedback('');
        setSaveError('');
        setNotifications((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSecurityChange = (
        field: keyof SecuritySettings,
        value: boolean | number | undefined,
    ) => {
        clearFieldError(String(field));
        setFeedback('');
        setSaveError('');
        setSecurity((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        if (!settings || !dirtyTabs[activeTab]) {
            return;
        }

        setIsSaving(true);
        setFeedback('');
        setSaveError('');

        try {
            if (activeTab === 'account') {
                await saveAccountSettings();
            } else if (activeTab === 'notifications') {
                const updatedNotifications =
                    await updateNotificationSettings(notifications);

                setSettings((current) =>
                    current
                        ? {
                              ...current,
                              notifications: updatedNotifications,
                          }
                        : current,
                );
                setNotifications(updatedNotifications);
                setErrors({});
                setFeedback('Notification preferences have been saved.');
            } else {
                await saveSecuritySettings();
            }
        } catch (error) {
            setSaveError(
                error instanceof Error
                    ? error.message
                    : 'Unable to save settings.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const saveAccountSettings = async () => {
        const accountResult = accountSchema.safeParse(account);
        const nextErrors: Record<string, string> = {};

        if (!accountResult.success) {
            Object.assign(nextErrors, zodErrorsToRecord(accountResult.error));
        }

        if (hasPasswordChange) {
            const passwordResult = passwordSchema.safeParse(password);

            if (!passwordResult.success) {
                Object.assign(
                    nextErrors,
                    zodErrorsToRecord(passwordResult.error),
                );
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);

            throw new Error('Please fix the highlighted account fields.');
        }

        let nextAccount = account;

        if (profilePhotoFile) {
            const uploadResult = await uploadProfilePhoto(profilePhotoFile);
            nextAccount = {
                ...account,
                profilePhotoUrl: uploadResult.profilePhotoUrl,
            };
        }

        const updatedAccount = await updateAccountSettings(nextAccount);

        if (hasPasswordChange) {
            await changePassword(password);

            setPassword(emptyPassword);
        }

        setAccount(updatedAccount);
        setSettings((current) =>
            current
                ? {
                      ...current,
                      account: updatedAccount,
                  }
                : current,
        );
        setProfilePhotoFile(null);
        setProfilePhotoPreviewUrl(undefined);
        setErrors({});
        setFeedback('Account settings have been saved.');
    };

    const saveSecuritySettings = async () => {
        const securityResult = securitySchema.safeParse(security);

        if (!securityResult.success) {
            setErrors(zodErrorsToRecord(securityResult.error));

            throw new Error('Please fix the highlighted security fields.');
        }

        const updatedSecurity = await updateSecuritySettings(security);

        setSettings((current) =>
            current
                ? {
                      ...current,
                      security: updatedSecurity,
                  }
                : current,
        );
        setSecurity(updatedSecurity);
        setErrors({});
        setFeedback('Security settings have been saved.');
    };

    const handleConfirmDeactivationRequest = async () => {
        setDeactivationStatus('pending');
        setFeedback('');
        setSaveError('');

        try {
            await requestAccountDeactivation();
            setDeactivationStatus('submitted');
            setDeactivationModalOpen(false);
            setFeedback(
                'Account deactivation request has been submitted for Super Admin review.',
            );
        } catch (error) {
            setDeactivationStatus('failed');
            setSaveError(
                error instanceof Error
                    ? error.message
                    : 'Unable to submit deactivation request.',
            );
        }
    };

    return (
        <>
            <Head title="Agency Settings" />

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
                                Settings
                            </span>
                        </nav>

                        <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-2xl leading-9 font-bold text-[#1e3a8a]">
                                    Settings
                                </h1>
                                <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                                    Manage your account preferences,
                                    notifications, and security settings.
                                </p>
                            </div>
                            <SettingsSaveButton
                                isSaving={isSaving}
                                disabled={!canSave}
                                onClick={handleSave}
                            />
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
                            <SettingsLoadingState />
                        ) : (
                            <section className="mt-5 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                                <SettingsTabs
                                    activeTab={activeTab}
                                    dirtyTabs={dirtyTabs}
                                    onTabChange={(tab) => {
                                        setActiveTab(tab);
                                        setFeedback('');
                                        setSaveError('');
                                    }}
                                />

                                <div>
                                    {activeTab === 'account' ? (
                                        <AccountSettingsPanel
                                            account={account}
                                            password={password}
                                            profilePhotoPreviewUrl={
                                                profilePhotoPreviewUrl
                                            }
                                            errors={errors}
                                            onAccountChange={
                                                handleAccountChange
                                            }
                                            onPasswordChange={
                                                handlePasswordChange
                                            }
                                            onPhotoSelected={
                                                handlePhotoSelected
                                            }
                                        />
                                    ) : null}

                                    {activeTab === 'notifications' ? (
                                        <NotificationSettingsPanel
                                            notifications={notifications}
                                            onNotificationChange={
                                                handleNotificationChange
                                            }
                                        />
                                    ) : null}

                                    {activeTab === 'security' ? (
                                        <SecuritySettingsPanel
                                            security={security}
                                            errors={errors}
                                            deactivationRequested={
                                                deactivationStatus ===
                                                'submitted'
                                            }
                                            onSecurityChange={
                                                handleSecurityChange
                                            }
                                            onRequestDeactivation={() =>
                                                setDeactivationModalOpen(true)
                                            }
                                        />
                                    ) : null}
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            </AgencyAdminLayout>

            <DeactivateAccountModal
                open={deactivationModalOpen}
                isSubmitting={deactivationStatus === 'pending'}
                onOpenChange={(open) => {
                    if (deactivationStatus !== 'pending') {
                        setDeactivationModalOpen(open);
                    }
                }}
                onConfirm={handleConfirmDeactivationRequest}
            />
        </>
    );

    function clearFieldError(field: string) {
        setErrors((current) => {
            if (!current[field]) {
                return current;
            }

            const next = { ...current };
            delete next[field];

            return next;
        });
    }
}

function zodErrorsToRecord(error: z.ZodError) {
    return error.issues.reduce<Record<string, string>>((messages, issue) => {
        const key = String(issue.path[0] ?? 'form');

        if (!messages[key]) {
            messages[key] = issue.message;
        }

        return messages;
    }, {});
}

function readFilePreview(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to preview photo.'));
        reader.readAsDataURL(file);
    });
}

function SettingsLoadingState() {
    return (
        <section className="mt-5 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="h-[216px] animate-pulse rounded-[14px] bg-white" />
            <div className="space-y-6">
                <div className="h-[360px] animate-pulse rounded-[14px] bg-white" />
                <div className="h-[244px] animate-pulse rounded-[14px] bg-white" />
            </div>
        </section>
    );
}
