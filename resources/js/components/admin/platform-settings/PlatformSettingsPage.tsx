import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AccessControlPolicies } from '@/components/admin/platform-settings/AccessControlPolicies';
import { BackupRecoverySettings } from '@/components/admin/platform-settings/BackupRecoverySettings';
import { GeneralPlatformSettings } from '@/components/admin/platform-settings/GeneralPlatformSettings';
import { MaintenanceModeModal } from '@/components/admin/platform-settings/MaintenanceModeModal';
import { NotificationSettings } from '@/components/admin/platform-settings/NotificationSettings';
import { PlatformSettingsHeader } from '@/components/admin/platform-settings/PlatformSettingsHeader';
import { ResearchRepositorySettings } from '@/components/admin/platform-settings/ResearchRepositorySettings';
import { SecurityPolicies } from '@/components/admin/platform-settings/SecurityPolicies';
import { SystemMaintenanceControls } from '@/components/admin/platform-settings/SystemMaintenanceControls';
import {
    getPlatformSettings,
    runSystemBackup,
    updatePlatformSettings,
    uploadPlatformLogo,
} from '@/lib/admin/platform-settings-service';
import type {
    PlatformSettings,
    PlatformSettingsErrors,
} from '@/types/platform-settings';

function cloneSettings(settings: PlatformSettings): PlatformSettings {
    return {
        general: { ...settings.general },
        repository: {
            ...settings.repository,
            allowedFileTypes: [...settings.repository.allowedFileTypes],
        },
        accessControl: { ...settings.accessControl },
        security: { ...settings.security },
        notifications: { ...settings.notifications },
        maintenance: { ...settings.maintenance },
        backup: { ...settings.backup },
    };
}

function isPositiveNumber(value: number | undefined) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validateSettings(settings: PlatformSettings): PlatformSettingsErrors {
    const errors: PlatformSettingsErrors = {};

    if (!settings.general.systemName.trim()) {
        errors.systemName = 'System name is required.';
    }

    if (!settings.general.shortName.trim()) {
        errors.shortName = 'Short name is required.';
    }

    if (!isPositiveNumber(settings.repository.maxUploadSizeMb)) {
        errors.maxUploadSizeMb = 'Enter a valid maximum upload size.';
    }

    if (settings.repository.allowedFileTypes.length === 0) {
        errors.allowedFileTypes = 'At least one file type is required.';
    }

    if (!settings.repository.defaultResearchStatus) {
        errors.defaultResearchStatus = 'Default research status is required.';
    }

    if (!settings.accessControl.defaultAccessPolicy) {
        errors.defaultAccessPolicy = 'Default access policy is required.';
    }

    if (
        settings.accessControl.embargoOverrideEnabled &&
        !isPositiveNumber(settings.accessControl.embargoDurationMonths)
    ) {
        errors.embargoDurationMonths = 'Enter a valid embargo duration.';
    }

    if (!isPositiveNumber(settings.security.failedLoginThreshold)) {
        errors.failedLoginThreshold = 'Enter a valid failed login threshold.';
    }

    if (!isPositiveNumber(settings.security.lockoutDurationMinutes)) {
        errors.lockoutDurationMinutes = 'Enter a valid lockout duration.';
    }

    if (!isPositiveNumber(settings.security.sessionTimeoutMinutes)) {
        errors.sessionTimeoutMinutes = 'Enter a valid session timeout.';
    }

    if (
        settings.maintenance.maintenanceModeEnabled &&
        !settings.maintenance.maintenanceMessage.trim()
    ) {
        errors.maintenanceMessage =
            'Maintenance message is required when maintenance mode is enabled.';
    }

    if (!settings.backup.backupFrequency.trim()) {
        errors.backupFrequency = 'Backup frequency is required.';
    }

    return errors;
}

function hasErrors(errors: PlatformSettingsErrors) {
    return Object.keys(errors).length > 0;
}

export function PlatformSettingsPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [initialSettings, setInitialSettings] =
        useState<PlatformSettings | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [errors, setErrors] = useState<PlatformSettingsErrors>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBackupRunning, setIsBackupRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        getPlatformSettings()
            .then((loadedSettings) => {
                if (!isCurrent) {
                    return;
                }

                setSettings(loadedSettings);
                setInitialSettings(cloneSettings(loadedSettings));
                setError(null);
            })
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load platform settings.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setFeedback(null);
        }, 3200);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    useEffect(() => {
        return () => {
            if (logoPreviewUrl) {
                URL.revokeObjectURL(logoPreviewUrl);
            }
        };
    }, [logoPreviewUrl]);

    const isDirty = useMemo(() => {
        if (!settings || !initialSettings) {
            return false;
        }

        return (
            JSON.stringify(settings) !== JSON.stringify(initialSettings) ||
            Boolean(logoFile)
        );
    }, [initialSettings, logoFile, settings]);

    const updateSection = <Section extends keyof PlatformSettings>(
        section: Section,
        value: Partial<PlatformSettings[Section]>,
    ) => {
        setSettings((currentSettings) => {
            if (!currentSettings) {
                return currentSettings;
            }

            return {
                ...currentSettings,
                [section]: {
                    ...currentSettings[section],
                    ...value,
                },
            };
        });
        setErrors({});
        setError(null);
    };

    const handleLogoChange = (file: File | null) => {
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setErrors((currentErrors) => ({
                ...currentErrors,
                platformLogoUrl: 'Platform logo must be a valid image file.',
            }));

            return;
        }

        if (logoPreviewUrl) {
            URL.revokeObjectURL(logoPreviewUrl);
        }

        const previewUrl = URL.createObjectURL(file);

        setLogoFile(file);
        setLogoPreviewUrl(previewUrl);
        updateSection('general', { platformLogoUrl: previewUrl });
    };

    const handleMaintenanceModeChange = (enabled: boolean) => {
        if (enabled) {
            setIsMaintenanceModalOpen(true);

            return;
        }

        updateSection('maintenance', { maintenanceModeEnabled: false });
    };

    const handleConfirmMaintenanceMode = () => {
        updateSection('maintenance', { maintenanceModeEnabled: true });
        setIsMaintenanceModalOpen(false);
    };

    const handleRunBackup = async () => {
        if (!settings) {
            return;
        }

        setIsBackupRunning(true);
        updateSection('backup', { backupStatus: 'running' });

        try {
            const updatedSettings = await runSystemBackup();

            setSettings((currentSettings) => {
                if (!currentSettings) {
                    return currentSettings;
                }

                return {
                    ...currentSettings,
                    backup: {
                        ...currentSettings.backup,
                        lastBackupAt: updatedSettings.backup.lastBackupAt,
                        backupStatus: updatedSettings.backup.backupStatus,
                    },
                };
            });
            setInitialSettings((currentSettings) => {
                if (!currentSettings) {
                    return currentSettings;
                }

                return {
                    ...currentSettings,
                    backup: {
                        ...currentSettings.backup,
                        lastBackupAt: updatedSettings.backup.lastBackupAt,
                        backupStatus: updatedSettings.backup.backupStatus,
                    },
                };
            });
            setFeedback('System backup completed successfully.');
        } catch {
            updateSection('backup', { backupStatus: 'failed' });
            setError('Unable to complete the system backup.');
        } finally {
            setIsBackupRunning(false);
        }
    };

    const handleReset = () => {
        if (!initialSettings) {
            return;
        }

        setLogoFile(null);
        setSettings(cloneSettings(initialSettings));
        setErrors({});
        setFeedback('Unsaved changes have been reset.');
    };

    const handleSave = async () => {
        if (!settings) {
            return;
        }

        const validationErrors = validateSettings(settings);
        setErrors(validationErrors);

        if (hasErrors(validationErrors)) {
            setError('Review the highlighted settings before saving.');

            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            let payload = cloneSettings(settings);

            if (logoFile) {
                const platformLogoUrl = await uploadPlatformLogo(logoFile);
                payload = {
                    ...payload,
                    general: {
                        ...payload.general,
                        platformLogoUrl,
                    },
                };
            }

            const savedSettings = await updatePlatformSettings(payload);

            setSettings(savedSettings);
            setInitialSettings(cloneSettings(savedSettings));
            setLogoFile(null);
            setFeedback('Platform settings have been saved.');
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Unable to save platform settings.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <PlatformSettingsHeader
                    isDirty={isDirty}
                    isSaving={isSaving}
                    onSave={handleSave}
                />

                {error ? (
                    <div className="mt-5 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                        {error}
                    </div>
                ) : null}

                {feedback ? (
                    <div className="mt-5 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
                        {feedback}
                    </div>
                ) : null}

                {isLoading || !settings ? (
                    <div className="mt-6 space-y-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-48 animate-pulse rounded-[14px] border border-[#e5e7eb] bg-white"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mt-6 space-y-5">
                            <GeneralPlatformSettings
                                settings={settings.general}
                                errors={errors}
                                onChange={(value) =>
                                    updateSection('general', value)
                                }
                                onLogoChange={handleLogoChange}
                            />
                            <ResearchRepositorySettings
                                settings={settings.repository}
                                errors={errors}
                                onChange={(value) =>
                                    updateSection('repository', value)
                                }
                            />
                            <AccessControlPolicies
                                settings={settings.accessControl}
                                errors={errors}
                                onChange={(value) =>
                                    updateSection('accessControl', value)
                                }
                            />
                            <SecurityPolicies
                                settings={settings.security}
                                errors={errors}
                                onChange={(value) =>
                                    updateSection('security', value)
                                }
                            />
                            <NotificationSettings
                                settings={settings.notifications}
                                onChange={(value) =>
                                    updateSection('notifications', value)
                                }
                            />
                            <SystemMaintenanceControls
                                settings={settings.maintenance}
                                errors={errors}
                                onChange={(value) =>
                                    updateSection('maintenance', value)
                                }
                                onMaintenanceModeChange={
                                    handleMaintenanceModeChange
                                }
                            />
                            <BackupRecoverySettings
                                settings={settings.backup}
                                errors={errors}
                                isRunning={isBackupRunning}
                                onChange={(value) =>
                                    updateSection('backup', value)
                                }
                                onRunBackup={handleRunBackup}
                            />
                        </div>

                        <div className="mt-5 flex justify-end gap-3 pb-4">
                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={!isDirty || isSaving}
                                className="h-[42px] rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                Reset to Defaults
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] transition hover:bg-[#172f70] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        <MaintenanceModeModal
                            open={isMaintenanceModalOpen}
                            onOpenChange={setIsMaintenanceModalOpen}
                            onConfirm={handleConfirmMaintenanceMode}
                        />
                    </>
                )}
            </main>
        </AdminLayout>
    );
}
