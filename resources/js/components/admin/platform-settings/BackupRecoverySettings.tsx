import { CheckCircle2, Clock3, DatabaseBackup, RotateCw } from 'lucide-react';
import type { PlatformSettings } from '@/types/platform-settings';
import { Field, SectionCard } from './platform-settings-controls';

type BackupRecoverySettingsProps = {
    settings: PlatformSettings['backup'];
    errors: Record<string, string>;
    isRunning: boolean;
    onChange: (settings: Partial<PlatformSettings['backup']>) => void;
    onRunBackup: () => void;
};

const backupFrequencyOptions = [
    'Daily at 03:00 AM',
    'Every 12 hours',
    'Weekly on Sunday',
    'Monthly on the 1st',
];

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

export function BackupRecoverySettings({
    settings,
    errors,
    isRunning,
    onChange,
    onRunBackup,
}: BackupRecoverySettingsProps) {
    const statusText =
        settings.backupStatus === 'running'
            ? 'Backup running'
            : settings.backupStatus === 'failed'
              ? 'Backup failed'
              : 'Completed successfully';

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
                        Last Backup
                    </div>
                    <p className="mt-3 text-sm leading-5 font-medium text-[#364153]">
                        {formatBackupDate(settings.lastBackupAt)}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs leading-4 font-medium text-[#00a63e]">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        {statusText}
                    </div>
                </div>

                <div className="rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] px-4 py-4">
                    <Field
                        label="Backup Frequency"
                        error={errors.backupFrequency}
                    >
                        <select
                            value={settings.backupFrequency}
                            onChange={(event) =>
                                onChange({
                                    backupFrequency: event.target.value,
                                })
                            }
                            className="mt-2 h-[42px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm text-[#364153] transition outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                        >
                            {backupFrequencyOptions.map((frequency) => (
                                <option key={frequency} value={frequency}>
                                    {frequency}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            <div className="mt-5">
                <button
                    type="button"
                    onClick={onRunBackup}
                    disabled={isRunning}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] transition hover:bg-[#172f70] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RotateCw
                        className={isRunning ? 'size-4 animate-spin' : 'size-4'}
                        aria-hidden="true"
                    />
                    {isRunning ? 'Running Backup...' : 'Run System Backup'}
                </button>
            </div>
        </SectionCard>
    );
}
