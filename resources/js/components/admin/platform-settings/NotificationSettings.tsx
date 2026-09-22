import { Bell, Mail, ShieldCheck } from 'lucide-react';
import type { PlatformSettings } from '@/types/platform-settings';
import { SectionCard, ToggleRow } from './platform-settings-controls';

type NotificationSettingsProps = {
    settings: PlatformSettings['notifications'];
    onChange: (settings: Partial<PlatformSettings['notifications']>) => void;
};

export function NotificationSettings({
    settings,
    onChange,
}: NotificationSettingsProps) {
    return (
        <SectionCard
            title="Notification Settings"
            icon={Bell}
            iconClassName="bg-[#dcfce7] text-[#16a34a]"
        >
            <div className="mb-5 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs leading-5 text-[#92400e]">
                These values are saved as planned notification preferences but
                are not yet enforced by notification delivery. Email transport
                remains deployment-managed.
            </div>
            <div className="space-y-4">
                <ToggleRow
                    title="Enable System Notifications"
                    description="Planned global default; not yet enforced"
                    icon={Bell}
                    checked={settings.systemNotificationsEnabled}
                    onChange={(systemNotificationsEnabled) =>
                        onChange({ systemNotificationsEnabled })
                    }
                />
                <ToggleRow
                    title="Enable Email Notifications"
                    description="Deployment-managed; this toggle does not start email delivery"
                    icon={Mail}
                    checked={settings.emailNotificationsEnabled}
                    onChange={(emailNotificationsEnabled) =>
                        onChange({ emailNotificationsEnabled })
                    }
                />
                <ToggleRow
                    title="Enable Security Alerts"
                    description="Planned global default; security event logging remains active"
                    icon={ShieldCheck}
                    checked={settings.securityAlertsEnabled}
                    onChange={(securityAlertsEnabled) =>
                        onChange({ securityAlertsEnabled })
                    }
                />
            </div>

            <div className="mt-5">
                <div className="text-xs leading-4 font-semibold text-[#4a5565]">
                    Notification Events
                </div>
                <div className="mt-4 space-y-2">
                    <ToggleRow
                        title="Access request submitted"
                        description="When a user submits an access request for research"
                        checked={settings.notifyAccessRequestSubmitted}
                        onChange={(notifyAccessRequestSubmitted) =>
                            onChange({ notifyAccessRequestSubmitted })
                        }
                    />
                    <ToggleRow
                        title="Research published"
                        description="When a new research record is published"
                        checked={settings.notifyResearchPublished}
                        onChange={(notifyResearchPublished) =>
                            onChange({ notifyResearchPublished })
                        }
                    />
                    <ToggleRow
                        title="Weekly activity digest"
                        description="Receive a summary of platform activity each week"
                        checked={settings.notifyWeeklyActivityDigest}
                        onChange={(notifyWeeklyActivityDigest) =>
                            onChange({ notifyWeeklyActivityDigest })
                        }
                    />
                </div>
            </div>
        </SectionCard>
    );
}
