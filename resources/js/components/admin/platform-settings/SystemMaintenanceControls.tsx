import { AlertTriangle, Wrench } from 'lucide-react';
import type { PlatformSettings } from '@/types/platform-settings';
import {
    Field,
    SectionCard,
    ToggleSwitch,
    textareaClassName,
} from './platform-settings-controls';

type SystemMaintenanceControlsProps = {
    settings: PlatformSettings['maintenance'];
    errors: Record<string, string>;
    onChange: (settings: Partial<PlatformSettings['maintenance']>) => void;
    onMaintenanceModeChange: (enabled: boolean) => void;
};

export function SystemMaintenanceControls({
    settings,
    errors,
    onChange,
    onMaintenanceModeChange,
}: SystemMaintenanceControlsProps) {
    return (
        <SectionCard
            title="System Maintenance Controls"
            icon={Wrench}
            iconClassName="bg-[#fef3c7] text-[#d97706]"
        >
            <div className="rounded-[14px] border border-[#fee685] bg-[#fffbeb]/50 px-5 py-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <AlertTriangle
                            className="size-5 shrink-0 text-[#f59e0b]"
                            aria-hidden="true"
                        />
                        <div className="min-w-0">
                            <div className="text-sm leading-5 font-semibold text-[#1e2939]">
                                Maintenance Mode
                            </div>
                            <p className="text-xs leading-4 text-[#6a7282]">
                                When enabled, only Super Admins can access the
                                platform
                            </p>
                        </div>
                    </div>
                    <ToggleSwitch
                        checked={settings.maintenanceModeEnabled}
                        onChange={onMaintenanceModeChange}
                        label="Maintenance Mode"
                    />
                </div>
            </div>

            <div className="mt-5">
                <Field
                    label="Maintenance Message"
                    error={errors.maintenanceMessage}
                    hint="This message will be displayed to users when maintenance mode is active."
                >
                    <textarea
                        value={settings.maintenanceMessage}
                        onChange={(event) =>
                            onChange({
                                maintenanceMessage: event.target.value,
                            })
                        }
                        className={textareaClassName}
                    />
                </Field>
            </div>

            <div className="mt-5">
                <button
                    type="button"
                    onClick={() =>
                        onMaintenanceModeChange(
                            !settings.maintenanceModeEnabled,
                        )
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#fe9a00] px-4 text-sm font-semibold text-white transition hover:bg-[#ea8a00]"
                >
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    {settings.maintenanceModeEnabled
                        ? 'Disable Maintenance Mode'
                        : 'Enable Maintenance Mode'}
                </button>
            </div>
        </SectionCard>
    );
}
