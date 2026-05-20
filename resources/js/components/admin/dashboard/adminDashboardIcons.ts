import {
    Activity,
    Archive,
    BarChart3,
    Bell,
    Building2,
    ClipboardList,
    FileText,
    LockKeyhole,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminDashboardIcon } from '@/types/admin-dashboard';

export const adminDashboardIcons: Record<AdminDashboardIcon, LucideIcon> = {
    activity: Activity,
    archive: Archive,
    'bar-chart': BarChart3,
    bell: Bell,
    building: Building2,
    clipboard: ClipboardList,
    'file-text': FileText,
    lock: LockKeyhole,
    shield: ShieldCheck,
    users: Users,
};
