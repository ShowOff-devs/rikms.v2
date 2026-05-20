import { BellRing, ShieldAlert } from 'lucide-react';
import type { PlatformSettings } from '@/types/platform-settings';
import {
    Field,
    SectionCard,
    ToggleRow,
    UnitInput,
} from './platform-settings-controls';

type SecurityPoliciesProps = {
    settings: PlatformSettings['security'];
    errors: Record<string, string>;
    onChange: (settings: Partial<PlatformSettings['security']>) => void;
};

export function SecurityPolicies({
    settings,
    errors,
    onChange,
}: SecurityPoliciesProps) {
    return (
        <SectionCard
            title="Security Policies"
            icon={ShieldAlert}
            iconClassName="bg-[#fee2e2] text-[#dc2626]"
        >
            <div className="space-y-4">
                <ToggleRow
                    title="Require MFA for Super Admin"
                    description="Enforce multi-factor authentication for Super Admin accounts"
                    icon={ShieldAlert}
                    checked={settings.requireMfaForSuperAdmins}
                    onChange={(requireMfaForSuperAdmins) =>
                        onChange({ requireMfaForSuperAdmins })
                    }
                />
                <ToggleRow
                    title="Enable Login Alerts"
                    description="Notify admins on new or suspicious login activity"
                    icon={BellRing}
                    checked={settings.loginAlertsEnabled}
                    onChange={(loginAlertsEnabled) =>
                        onChange({ loginAlertsEnabled })
                    }
                />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <Field
                    label="Failed Login Threshold"
                    error={errors.failedLoginThreshold}
                >
                    <UnitInput
                        value={settings.failedLoginThreshold}
                        unit="failed attempts"
                        onChange={(failedLoginThreshold) =>
                            onChange({
                                failedLoginThreshold:
                                    failedLoginThreshold === ''
                                        ? 0
                                        : failedLoginThreshold,
                            })
                        }
                    />
                </Field>
                <Field
                    label="Lockout Duration"
                    error={errors.lockoutDurationMinutes}
                >
                    <UnitInput
                        value={settings.lockoutDurationMinutes}
                        unit="minutes"
                        onChange={(lockoutDurationMinutes) =>
                            onChange({
                                lockoutDurationMinutes:
                                    lockoutDurationMinutes === ''
                                        ? 0
                                        : lockoutDurationMinutes,
                            })
                        }
                    />
                </Field>
                <Field
                    label="Session Timeout Duration"
                    error={errors.sessionTimeoutMinutes}
                >
                    <UnitInput
                        value={settings.sessionTimeoutMinutes}
                        unit="minutes"
                        onChange={(sessionTimeoutMinutes) =>
                            onChange({
                                sessionTimeoutMinutes:
                                    sessionTimeoutMinutes === ''
                                        ? 0
                                        : sessionTimeoutMinutes,
                            })
                        }
                    />
                </Field>
            </div>
        </SectionCard>
    );
}
