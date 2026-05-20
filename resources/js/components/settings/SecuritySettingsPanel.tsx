import { ActiveSessionsCard } from '@/components/settings/ActiveSessionsCard';
import { DangerZoneCard } from '@/components/settings/DangerZoneCard';
import type { SecuritySettings } from '@/types/settings';

type SecuritySettingsPanelProps = {
    security: SecuritySettings;
    errors: Record<string, string>;
    deactivationRequested: boolean;
    onSecurityChange: (
        field: keyof SecuritySettings,
        value: boolean | number | undefined,
    ) => void;
    onRequestDeactivation: () => void;
};

export function SecuritySettingsPanel({
    security,
    errors,
    deactivationRequested,
    onSecurityChange,
    onRequestDeactivation,
}: SecuritySettingsPanelProps) {
    return (
        <div className="space-y-6">
            <SecuritySettingsCard
                security={security}
                errors={errors}
                onSecurityChange={onSecurityChange}
            />
            <ActiveSessionsCard sessions={security.activeSessions} />
            <DangerZoneCard
                deactivationRequested={deactivationRequested}
                onRequestDeactivation={onRequestDeactivation}
            />
        </div>
    );
}

function SecuritySettingsCard({
    security,
    errors,
    onSecurityChange,
}: {
    security: SecuritySettings;
    errors: Record<string, string>;
    onSecurityChange: (
        field: keyof SecuritySettings,
        value: boolean | number | undefined,
    ) => void;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#f3f4f6] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                Security Settings
            </h2>

            <div className="mt-5 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[#e5e7eb] px-4 py-4">
                    <div>
                        <h3 className="text-sm leading-5 font-semibold text-[#101828]">
                            Two-Factor Authentication
                        </h3>
                        <p className="mt-0.5 text-xs leading-4 text-[#6a7282]">
                            Add an extra verification step when signing in.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={security.twoFactorEnabled}
                        aria-label="Two-Factor Authentication"
                        onClick={() =>
                            onSecurityChange(
                                'twoFactorEnabled',
                                !security.twoFactorEnabled,
                            )
                        }
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                            security.twoFactorEnabled
                                ? 'bg-[#1e3a8a]'
                                : 'bg-[#d1d5dc]'
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition ${
                                security.twoFactorEnabled
                                    ? 'left-[22px]'
                                    : 'left-0.5'
                            }`}
                        />
                    </button>
                </div>

                <label className="block">
                    <span className="mb-1.5 block text-sm leading-5 font-medium text-[#364153]">
                        Session Timeout
                    </span>
                    <div className="flex items-center gap-3">
                        <input
                            value={security.sessionTimeout ?? ''}
                            onChange={(event) =>
                                onSecurityChange(
                                    'sessionTimeout',
                                    event.target.value
                                        ? Number(event.target.value)
                                        : undefined,
                                )
                            }
                            type="number"
                            min={5}
                            max={240}
                            aria-invalid={Boolean(errors.sessionTimeout)}
                            className="h-[42px] w-32 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#101828] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 aria-invalid:border-[#ff6467] aria-invalid:ring-[#ff6467]/10"
                        />
                        <span className="text-sm leading-5 text-[#6a7282]">
                            minutes
                        </span>
                    </div>
                    {errors.sessionTimeout ? (
                        <span className="mt-1 block text-xs leading-4 font-medium text-[#e7000b]">
                            {errors.sessionTimeout}
                        </span>
                    ) : null}
                </label>
            </div>
        </section>
    );
}
