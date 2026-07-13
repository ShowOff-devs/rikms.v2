import { KeyRound, LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccessPolicy, PlatformSettings } from '@/types/platform-settings';
import {
    Field,
    SectionCard,
    ToggleRow,
    UnitInput,
} from './platform-settings-controls';

type AccessControlPoliciesProps = {
    settings: PlatformSettings['accessControl'];
    errors: Record<string, string>;
    onChange: (settings: Partial<PlatformSettings['accessControl']>) => void;
};

const accessPolicies: Array<{ value: AccessPolicy; label: string }> = [
    { value: 'public', label: 'Public' },
    { value: 'request-access', label: 'Request Access' },
    { value: 'restricted', label: 'Restricted' },
];

export function AccessControlPolicies({
    settings,
    errors,
    onChange,
}: AccessControlPoliciesProps) {
    return (
        <SectionCard
            title="Access Control Policies"
            icon={KeyRound}
            iconClassName="bg-[#fef3c7] text-[#d97706]"
        >
            <div className="space-y-5">
                <ToggleRow
                    title="Enable Access Request System"
                    description="Active and enforced in the public API"
                    icon={LockKeyhole}
                    checked={settings.accessRequestEnabled}
                    onChange={(accessRequestEnabled) =>
                        onChange({ accessRequestEnabled })
                    }
                />

                <Field
                    label="Default Access Policy"
                    error={errors.defaultAccessPolicy}
                    hint="Not yet enforced by research creation."
                >
                    <div className="grid overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] lg:grid-cols-3">
                        {accessPolicies.map((policy) => {
                            const isActive =
                                settings.defaultAccessPolicy === policy.value;

                            return (
                                <button
                                    key={policy.value}
                                    type="button"
                                    onClick={() =>
                                        onChange({
                                            defaultAccessPolicy: policy.value,
                                        })
                                    }
                                    className={cn(
                                        'h-[46px] border-[#e5e7eb] text-sm font-medium transition first:border-0 lg:border-l',
                                        isActive
                                            ? 'bg-white text-[#1e3a8a] shadow-[inset_0_0_0_1px_rgba(30,58,138,0.18)]'
                                            : 'text-[#4a5565] hover:bg-white/70',
                                    )}
                                >
                                    {policy.label}
                                </button>
                            );
                        })}
                    </div>
                </Field>

                <ToggleRow
                    title="Embargo Option"
                    description="Not yet enforced as a global platform control"
                    checked={settings.embargoOverrideEnabled}
                    onChange={(embargoOverrideEnabled) =>
                        onChange({ embargoOverrideEnabled })
                    }
                />

                <div className="max-w-[220px]">
                    <Field
                        label="Embargo Duration"
                        error={errors.embargoDurationMonths}
                        hint="Not yet enforced as a global platform control."
                    >
                        <UnitInput
                            value={settings.embargoDurationMonths ?? ''}
                            unit="months"
                            disabled={!settings.embargoOverrideEnabled}
                            onChange={(embargoDurationMonths) =>
                                onChange({
                                    embargoDurationMonths:
                                        embargoDurationMonths === ''
                                            ? undefined
                                            : embargoDurationMonths,
                                })
                            }
                        />
                    </Field>
                </div>
            </div>
        </SectionCard>
    );
}
