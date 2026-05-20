import { KeyRound, Shield, UsersRound } from 'lucide-react';

export type RBACTab = 'roles' | 'permissions' | 'assignments';

type RBACTabsProps = {
    activeTab: RBACTab;
    onTabChange: (tab: RBACTab) => void;
};

const tabs = [
    { id: 'roles' as const, label: 'Roles', icon: Shield },
    { id: 'permissions' as const, label: 'Permissions', icon: KeyRound },
    {
        id: 'assignments' as const,
        label: 'User Role Assignments',
        icon: UsersRound,
    },
];

export function RBACTabs({ activeTab, onTabChange }: RBACTabsProps) {
    return (
        <div className="border-b border-[#e5e7eb] px-4 sm:px-6">
            <div className="flex h-[50px] gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`inline-flex h-[50px] shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition ${
                                isActive
                                    ? 'border-[#1e3a8a] text-[#1e3a8a]'
                                    : 'border-transparent text-[#4a5565] hover:text-[#1e2939]'
                            }`}
                        >
                            <tab.icon className="size-4" aria-hidden="true" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
