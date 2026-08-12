import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    DatabaseBackup,
    HardDrive,
    KeyRound,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { getBackupReadiness } from '@/lib/admin/platform-settings-service';
import type {
    BackupReadiness,
    PlatformSettings,
} from '@/types/platform-settings';
import { Field, SectionCard } from './platform-settings-controls';

type BackupRecoverySettingsProps = {
    settings: PlatformSettings['backup'];
    errors: Record<string, string>;
    onChange: (settings: Partial<PlatformSettings['backup']>) => void;
};

const backupFrequencyOptions = [
    'Daily at 03:00 AM',
    'Every 12 hours',
    'Weekly on Sunday',
    'Monthly on the 1st',
];

const readinessMessages: Record<string, string> = {
    destination_not_configured:
        'Add BACKUP_DESTINATION_PATH on the server after connecting the external drive.',
    destination_not_connected:
        'The configured external drive is not currently connected or mounted.',
    destination_is_not_external:
        'The destination must be outside the application and its storage directories.',
    destination_not_writable:
        'The application service account cannot write to the destination.',
    insufficient_free_space:
        'The destination does not meet the configured minimum free-space requirement.',
    encryption_key_not_configured:
        'Add a dedicated backup encryption key on the server. Do not use the drive recovery key.',
    ready_for_test_backup:
        'The destination is ready for a controlled test backup. Execution remains disabled.',
};

function formatBackupDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function ReadinessItem({ label, passed }: { label: string; passed: boolean }) {
    const Icon = passed ? CheckCircle2 : XCircle;

    return (
        <div className="flex items-center gap-2 text-sm text-[#364153]">
            <Icon
                className={
                    passed ? 'size-4 text-emerald-600' : 'size-4 text-amber-600'
                }
                aria-hidden="true"
            />
            <span>{label}</span>
        </div>
    );
}

export function BackupRecoverySettings({
    settings,
    errors,
    onChange,
}: BackupRecoverySettingsProps) {
    const [readiness, setReadiness] = useState<BackupReadiness | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [readinessError, setReadinessError] = useState<string | null>(null);

    const checkReadiness = async () => {
        setIsChecking(true);
        setReadinessError(null);

        try {
            setReadiness(await getBackupReadiness());
        } catch {
            setReadinessError('Unable to check backup destination readiness.');
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <SectionCard
            title="Backup and Data Recovery"
            icon={DatabaseBackup}
            iconClassName="bg-[#dbeafe] text-[#1e40af]"
        >
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] px-4 py-4">
                    <div className="flex items-center gap-3 text-sm font-semibold text-[#1e2939]">
                        <Clock3
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Last Verified Backup
                    </div>
                    <p className="mt-3 text-sm leading-5 font-medium text-[#364153]">
                        {formatBackupDate(settings.lastBackupAt)}
                    </p>
                    <p className="mt-1 text-xs leading-4 font-medium text-[#b45309]">
                        No backup is recorded until real execution and
                        verification exist.
                    </p>
                </div>

                <Field
                    label="Destination Label"
                    error={errors.backupDestinationLabel}
                >
                    <input
                        value={settings.destinationLabel}
                        maxLength={100}
                        onChange={(event) =>
                            onChange({ destinationLabel: event.target.value })
                        }
                        placeholder="External drive"
                        className="mt-2 h-[42px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm text-[#364153] outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                    <p className="mt-1 text-xs text-[#6a7282]">
                        Display label only; the mount path is configured
                        securely on the server.
                    </p>
                </Field>

                <Field
                    label="Prepared Backup Frequency"
                    error={errors.backupFrequency}
                >
                    <select
                        value={settings.backupFrequency}
                        onChange={(event) =>
                            onChange({ backupFrequency: event.target.value })
                        }
                        className="mt-2 h-[42px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm text-[#364153] outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    >
                        {backupFrequencyOptions.map((frequency) => (
                            <option key={frequency} value={frequency}>
                                {frequency}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field
                    label="Prepared Retention (days)"
                    error={errors.backupRetentionDays}
                >
                    <input
                        type="number"
                        min={1}
                        max={365}
                        value={settings.retentionDays}
                        onChange={(event) =>
                            onChange({
                                retentionDays: Number(event.target.value),
                            })
                        }
                        className="mt-2 h-[42px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm text-[#364153] outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </Field>
            </div>

            <div className="mt-5 rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                <div className="flex gap-3">
                    <HardDrive
                        className="mt-0.5 size-4 shrink-0 text-[#1d4ed8]"
                        aria-hidden="true"
                    />
                    <p className="text-sm leading-6 text-[#1e3a8a]">
                        Connect and unlock the external drive through the
                        operating system, then set
                        <code className="mx-1 rounded bg-white px-1 py-0.5">
                            BACKUP_DESTINATION_PATH
                        </code>
                        and a separate
                        <code className="mx-1 rounded bg-white px-1 py-0.5">
                            BACKUP_ENCRYPTION_KEY
                        </code>
                        in the deployment environment. Recovery keys are never
                        entered here.
                    </p>
                </div>
            </div>

            {readiness && (
                <div className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <div className="flex items-center gap-2 font-semibold text-[#1e2939]">
                        <KeyRound
                            className="size-4 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        Destination readiness: {readiness.destination.display}
                    </div>
                    <p className="mt-2 text-sm text-[#4a5565]">
                        {readinessMessages[readiness.status] ??
                            'Backup readiness could not be determined.'}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <ReadinessItem
                            label="Destination configured"
                            passed={readiness.destination.configured}
                        />
                        <ReadinessItem
                            label="Drive connected"
                            passed={readiness.destination.connected}
                        />
                        <ReadinessItem
                            label="Destination writable"
                            passed={readiness.destination.writable}
                        />
                        <ReadinessItem
                            label="Outside application storage"
                            passed={readiness.destination.outside_application}
                        />
                        <ReadinessItem
                            label="Separate filesystem or drive"
                            passed={
                                !readiness.destination
                                    .separate_filesystem_required ||
                                readiness.destination.separate_filesystem
                            }
                        />
                        <ReadinessItem
                            label="Encryption key configured"
                            passed={readiness.encryption_key_configured}
                        />
                        <ReadinessItem
                            label={`Minimum free space: ${readiness.destination.minimum_free_space_mb} MB`}
                            passed={
                                readiness.destination.free_space_mb !== null &&
                                readiness.destination.free_space_mb >=
                                    readiness.destination.minimum_free_space_mb
                            }
                        />
                    </div>
                </div>
            )}

            {readinessError && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-700">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    {readinessError}
                </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={checkReadiness}
                    disabled={isChecking}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white transition hover:bg-[#172f70] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        className={`size-4 ${isChecking ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                    />
                    {isChecking ? 'Checking...' : 'Check Backup Readiness'}
                </button>
                <span className="text-xs font-medium text-[#b45309]">
                    Backup execution and automatic deletion remain disabled.
                </span>
            </div>
        </SectionCard>
    );
}
