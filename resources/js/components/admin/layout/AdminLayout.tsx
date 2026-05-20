import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopbar } from '@/components/admin/layout/AdminTopbar';

const SUPER_ADMIN_SIDEBAR_STORAGE_KEY = 'rikms-superadmin-sidebar-collapsed';

type AdminLayoutProps = {
    children: ReactNode;
    search: string;
    onSearchChange: (value: string) => void;
};

export function AdminLayout({
    children,
    search,
    onSearchChange,
}: AdminLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return (
            window.localStorage.getItem(SUPER_ADMIN_SIDEBAR_STORAGE_KEY) ===
            'true'
        );
    });

    useEffect(() => {
        window.localStorage.setItem(
            SUPER_ADMIN_SIDEBAR_STORAGE_KEY,
            String(isSidebarCollapsed),
        );
    }, [isSidebarCollapsed]);

    const toggleSidebar = () => {
        setIsSidebarCollapsed((currentValue) => !currentValue);
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
            <AdminTopbar
                isSidebarCollapsed={isSidebarCollapsed}
                search={search}
                onSearchChange={onSearchChange}
            />
            <div className="flex min-h-[calc(100vh-64px)]">
                <AdminSidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={toggleSidebar}
                />
                <div className="min-w-0 flex-1 transition-all duration-300">
                    {children}
                </div>
            </div>
        </div>
    );
}
