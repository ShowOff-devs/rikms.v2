import { Bell, ShieldCheck, UserRound } from 'lucide-react';
import type { SettingsTab } from '@/types/settings';

type SettingsTabsProps = {
    activeTab: SettingsTab;
    dirtyTabs: Partial<Record<SettingsTab, boolean>>;
    onTabChange: (tab: SettingsTab) => void;
};

const tabs: Array<{
    id: SettingsTab;
    label: string;
    description: string;
    icon: typeof UserRound;
}> = [
    {
        id: 'account',
        label: 'Account',
        description: 'Profile and password',
        icon: UserRound,
    },
    {
        id: 'notifications',
        label: 'Notifications',
        description: 'Email and reports',
        icon: Bell,
    },
    {
        id: 'security',
        label: 'Security',
        description: 'Access and sessions',
        icon: ShieldCheck,
    },
];

export function SettingsTabs({
    activeTab,
    dirtyTabs,
    onTabChange,
}: SettingsTabsProps) {
    return (
        <aside className="rounded-[14px] border border-[#e5e7eb] bg-white p-2 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] lg:sticky lg:top-[88px]">
            <nav className="space-y-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`flex min-h-[64px] w-full items-center gap-3 rounded-[10px] px-3 text-left transition ${
                                isActive
                                    ? 'bg-[rgba(30,58,138,0.1)] text-[#1e3a8a]'
                                    : 'text-[#4a5565] hover:bg-[#f9fafb]'
                            }`}
                        >
                            <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
                                    isActive
                                        ? 'bg-[#1e3a8a] text-white'
                                        : 'bg-[#f3f4f6] text-[#6a7282]'
                                }`}
                            >
                                <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-sm leading-5 font-semibold">
                                    {tab.label}
                                    {dirtyTabs[tab.id] ? (
                                        <span className="size-2 rounded-full bg-[#f59e0b]" />
                                    ) : null}
                                </span>
                                <span className="mt-0.5 block text-xs leading-4 text-[#6a7282]">
                                    {tab.description}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
