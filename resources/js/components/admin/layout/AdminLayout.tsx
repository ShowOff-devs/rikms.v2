import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopbar } from '@/components/admin/layout/AdminTopbar';
import { getUnreadSystemNotificationCount } from '@/lib/admin/system-activity-service';

const SUPER_ADMIN_SIDEBAR_STORAGE_KEY = 'rikms-superadmin-sidebar-collapsed';

type AdminLayoutProps = {
    children: ReactNode;
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    unreadNotificationsCount?: number;
};

export function AdminLayout({
    children,
    search,
    onSearchChange,
    searchPlaceholder,
    unreadNotificationsCount,
}: AdminLayoutProps) {
    const [fetchedUnreadCount, setFetchedUnreadCount] = useState(0);
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

    useEffect(() => {
        document.body.classList.add('admin-portal');

        return () => document.body.classList.remove('admin-portal');
    }, []);

    useEffect(() => {
        if (unreadNotificationsCount !== undefined) {
            return;
        }

        let isCurrent = true;

        getUnreadSystemNotificationCount()
            .then((count) => {
                if (isCurrent) {
                    setFetchedUnreadCount(count);
                }
            })
            .catch(() => {
                // The badge is non-critical; page content should remain available.
            });

        return () => {
            isCurrent = false;
        };
    }, [unreadNotificationsCount]);

    const resolvedUnreadCount = unreadNotificationsCount ?? fetchedUnreadCount;

    const toggleSidebar = () => {
        setIsSidebarCollapsed((currentValue) => !currentValue);
    };

    return (
        <div className="admin-shell min-h-screen bg-[#f3f4f6] text-[#0f172a]">
            <AdminTopbar
                isSidebarCollapsed={isSidebarCollapsed}
                search={search}
                onSearchChange={onSearchChange}
                searchPlaceholder={searchPlaceholder}
                unreadNotificationsCount={resolvedUnreadCount}
            />
            <div className="flex min-h-[calc(100vh-64px)]">
                <AdminSidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={toggleSidebar}
                />
                <div className="admin-content min-w-0 flex-1 transition-all duration-300">
                    {children}
                </div>
            </div>
        </div>
    );
}
