import { cn } from '@/lib/utils';
import type { NotificationTabValue } from '@/types/system-activity';

export const notificationTabs: {
    value: NotificationTabValue;
    label: string;
}[] = [
    { value: 'all', label: 'All Notifications' },
    { value: 'research-updates', label: 'Research Updates' },
    { value: 'access-activity', label: 'Access Activity' },
    { value: 'security-alerts', label: 'Security Alerts' },
    { value: 'system-updates', label: 'System Updates' },
];

type NotificationTabsProps = {
    selectedCategory: NotificationTabValue;
    onCategoryChange: (category: NotificationTabValue) => void;
};

export function NotificationTabs({
    selectedCategory,
    onCategoryChange,
}: NotificationTabsProps) {
    return (
        <div className="overflow-x-auto border-b border-[#f3f4f6] px-6 py-2">
            <div className="flex min-w-max items-center gap-1">
                {notificationTabs.map((tab) => {
                    const isSelected = selectedCategory === tab.value;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => onCategoryChange(tab.value)}
                            className={cn(
                                'h-8 rounded-[10px] px-3.5 text-xs leading-4 font-medium transition',
                                isSelected
                                    ? 'bg-[#1e3a8a] font-semibold text-white'
                                    : 'text-[#6a7282] hover:bg-[#f9fafb] hover:text-[#1e3a8a]',
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
