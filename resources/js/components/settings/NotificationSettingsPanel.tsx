import { Bell, FileBarChart, Mail, Monitor } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NotificationSettings } from '@/types/settings';

type NotificationSettingsPanelProps = {
    notifications: NotificationSettings;
    onNotificationChange: (
        field: keyof NotificationSettings,
        value: boolean,
    ) => void;
};

export function NotificationSettingsPanel({
    notifications,
    onNotificationChange,
}: NotificationSettingsPanelProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#f3f4f6] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                Notification Preferences
            </h2>

            <div className="mt-5 grid gap-6">
                <NotificationGroup
                    icon={Mail}
                    title="Email Notifications"
                    description="Messages sent to your agency admin email."
                >
                    <ToggleRow
                        label="New access requests"
                        description="Notify me when users request access to restricted research."
                        checked={notifications.notifyNewAccessRequests}
                        onCheckedChange={(checked) =>
                            onNotificationChange(
                                'notifyNewAccessRequests',
                                checked,
                            )
                        }
                    />
                    <ToggleRow
                        label="Request approvals/denials"
                        description="Receive confirmation when access requests are processed."
                        checked={notifications.notifyRequestApprovalsDenials}
                        onCheckedChange={(checked) =>
                            onNotificationChange(
                                'notifyRequestApprovalsDenials',
                                checked,
                            )
                        }
                    />
                    <ToggleRow
                        label="New research uploads"
                        description="Alert me when a new research record is uploaded."
                        checked={notifications.notifyNewResearchUploads}
                        onCheckedChange={(checked) =>
                            onNotificationChange(
                                'notifyNewResearchUploads',
                                checked,
                            )
                        }
                    />
                </NotificationGroup>

                <NotificationGroup
                    icon={Bell}
                    title="Other Notifications"
                    description="Browser alerts, digests, and reporting reminders."
                >
                    <ToggleRow
                        icon={Monitor}
                        label="Browser notifications"
                        description="Show timely notifications while you are using RIKMS."
                        checked={notifications.browserNotifications}
                        onCheckedChange={(checked) =>
                            onNotificationChange(
                                'browserNotifications',
                                checked,
                            )
                        }
                    />
                    <ToggleRow
                        label="Weekly digest"
                        description="Summarize new activity across your agency workspace."
                        checked={notifications.weeklyDigest}
                        onCheckedChange={(checked) =>
                            onNotificationChange('weeklyDigest', checked)
                        }
                    />
                    <ToggleRow
                        icon={FileBarChart}
                        label="Monthly analytics report"
                        description="Send monthly research performance and access analytics."
                        checked={notifications.monthlyAnalyticsReport}
                        onCheckedChange={(checked) =>
                            onNotificationChange(
                                'monthlyAnalyticsReport',
                                checked,
                            )
                        }
                    />
                </NotificationGroup>
            </div>
        </section>
    );
}

function NotificationGroup({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Bell;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-[12px] border border-[#e5e7eb]">
            <div className="flex items-start gap-3 border-b border-[#f3f4f6] px-4 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]">
                    <Icon className="size-4" />
                </span>
                <span>
                    <h3 className="text-sm leading-5 font-semibold text-[#101828]">
                        {title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-4 text-[#6a7282]">
                        {description}
                    </p>
                </span>
            </div>
            <div className="divide-y divide-[#f3f4f6]">{children}</div>
        </div>
    );
}

function ToggleRow({
    icon: Icon,
    label,
    description,
    checked,
    disabled,
    onCheckedChange,
}: {
    icon?: typeof Bell;
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="flex min-w-0 items-start gap-3">
                {Icon ? (
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#f3f4f6] text-[#6a7282]">
                        <Icon className="size-4" />
                    </span>
                ) : null}
                <span className="min-w-0">
                    <span className="block text-sm leading-5 font-medium text-[#101828]">
                        {label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-[#6a7282]">
                        {description}
                    </span>
                </span>
            </div>
            <ToggleSwitch
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
                label={label}
            />
        </div>
    );
}

function ToggleSwitch({
    checked,
    disabled,
    onCheckedChange,
    label,
}: {
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                checked ? 'bg-[#1e3a8a]' : 'bg-[#d1d5dc]'
            }`}
        >
            <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition ${
                    checked ? 'left-[22px]' : 'left-0.5'
                }`}
            />
        </button>
    );
}
