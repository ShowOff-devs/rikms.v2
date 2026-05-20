import { Archive, Building2, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArchiveRecordType } from '@/types/admin-archive';

type ArchiveTabsProps = {
    activeTab: ArchiveRecordType;
    counts: Record<ArchiveRecordType, number>;
    onTabChange: (tab: ArchiveRecordType) => void;
};

const tabs: Array<{
    value: ArchiveRecordType;
    label: string;
    icon: LucideIcon;
}> = [
    { value: 'research', label: 'Archived Research', icon: Archive },
    { value: 'agency', label: 'Archived Agencies', icon: Building2 },
    { value: 'user', label: 'Archived Users', icon: UsersRound },
];

export function ArchiveTabs({
    activeTab,
    counts,
    onTabChange,
}: ArchiveTabsProps) {
    return (
        <div className="border-b border-[#f3f4f6] px-6">
            <div className="flex min-h-[50px] flex-wrap items-center gap-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => onTabChange(tab.value)}
                            className={cn(
                                'inline-flex h-[50px] items-center gap-2 border-b-2 px-4 text-sm leading-5 font-medium transition',
                                isActive
                                    ? 'border-[#ffb900] text-[#1e3a8a]'
                                    : 'border-transparent text-[#6a7282] hover:text-[#1e3a8a]',
                            )}
                        >
                            <Icon className="size-4" aria-hidden="true" />
                            {tab.label}
                            <span
                                className={cn(
                                    'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] leading-[15px] font-semibold',
                                    isActive
                                        ? 'bg-[#fffbeb] text-[#bb4d00]'
                                        : 'bg-[#f3f4f6] text-[#6a7282]',
                                )}
                            >
                                {counts[tab.value]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
