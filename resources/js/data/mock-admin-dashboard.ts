import type {
    AdminDashboardMetric,
    QuickManagementAction,
    ResearchByAgency,
    ResearchUploadByYear,
    SecurityStatus,
    SystemActivity,
    ModerationItem,
} from '@/types/admin-dashboard';

export const adminDashboardMetrics: AdminDashboardMetric[] = [
    {
        id: 'total-research-records',
        label: 'Total Research Records',
        value: 1248,
        helperText: '+24 this month',
        icon: 'file-text',
    },
    {
        id: 'participating-agencies',
        label: 'Participating Agencies',
        value: 9,
        helperText: 'Region XI',
        icon: 'building',
    },
    {
        id: 'agency-admin-users',
        label: 'Agency Admin Users',
        value: 27,
        helperText: '+3 new',
        icon: 'users',
    },
    {
        id: 'published-research',
        label: 'Published Research',
        value: 1052,
        helperText: '84.3% published',
        icon: 'bar-chart',
    },
    {
        id: 'pending-access-requests',
        label: 'Pending Access Requests',
        value: 18,
        helperText: '5 urgent',
        icon: 'clipboard',
    },
    {
        id: 'active-sessions',
        label: 'Active Sessions',
        value: 12,
        helperText: 'Online now',
        icon: 'activity',
    },
];

export const researchByAgency: ResearchByAgency[] = [
    { agency: 'DOST XI', count: 185, color: '#1e3a8a' },
    { agency: 'CHED XI', count: 152, color: '#1e3a8a' },
    { agency: 'DTI XI', count: 128, color: '#1e3a8a' },
    { agency: 'NEDA XI', count: 114, color: '#1e3a8a' },
    { agency: 'DEPED XI', count: 96, color: '#1e3a8a' },
    { agency: 'DARRO XI', count: 142, color: '#1e3a8a' },
    { agency: 'DRRMO', count: 108, color: '#1e3a8a' },
    { agency: 'SMAARRDEC', count: 88, color: '#1e3a8a' },
    { agency: 'USeP', count: 235, color: '#1e3a8a' },
];

export const researchUploadsByYear: ResearchUploadByYear[] = [
    { year: 2020, count: 85 },
    { year: 2021, count: 132 },
    { year: 2022, count: 198 },
    { year: 2023, count: 272 },
    { year: 2024, count: 316 },
    { year: 2025, count: 194 },
    { year: 2026, count: 50 },
];

export const systemActivityFeed: SystemActivity[] = [
    {
        id: 'activity-usep-uploaded',
        actor: 'Agency Admin (DOST XI)',
        agency: 'DOST XI',
        action: 'uploaded research',
        target: 'IoT-Based Water Quality Monitoring',
        timestamp: '2026-05-14T14:48:00+08:00',
        type: 'upload',
    },
    {
        id: 'activity-system-published',
        actor: 'System',
        action: 'published research',
        target: 'Climate Adaptation in Davao Agriculture',
        timestamp: '2026-05-14T14:26:00+08:00',
        type: 'publish',
    },
    {
        id: 'activity-access-approved',
        actor: 'Agency Admin (CHED XI)',
        agency: 'CHED XI',
        action: 'approved access request',
        target: 'Maria Santos',
        timestamp: '2026-05-14T13:10:00+08:00',
        type: 'access-approved',
    },
    {
        id: 'activity-metadata-updated',
        actor: 'Agency Admin (NEDA XI)',
        agency: 'NEDA XI',
        action: 'updated metadata',
        target: 'Regional Economic Growth Indicators 2025',
        timestamp: '2026-05-14T12:48:00+08:00',
        type: 'metadata-updated',
    },
    {
        id: 'activity-dti-uploaded',
        actor: 'Agency Admin (DTI XI)',
        agency: 'DTI XI',
        action: 'uploaded new research',
        target: 'MSME Digital Transformation Impact',
        timestamp: '2026-05-14T11:48:00+08:00',
        type: 'upload',
    },
];

export const pendingModerationItems: ModerationItem[] = [
    {
        id: 'moderation-duplicate-submission',
        title: 'Duplicate Research Submission Detected',
        agency: 'DOST XI',
        issueType: 'duplicate-research',
        severity: 'high',
        statusLabel: 'Flagged Record',
    },
    {
        id: 'moderation-missing-abstract-keywords',
        title: 'Missing Abstract and Keywords',
        agency: 'SMAARRDEC',
        issueType: 'missing-metadata',
        severity: 'medium',
        statusLabel: 'Metadata Issue',
    },
    {
        id: 'moderation-pending-access',
        title: 'Pending Access Request (72h+)',
        agency: 'RHRDC XI',
        issueType: 'pending-access',
        severity: 'medium',
        statusLabel: 'Access Request',
    },
    {
        id: 'moderation-author-affiliation',
        title: 'Incomplete Author Affiliation Data',
        agency: 'DRIERDC',
        issueType: 'incomplete-affiliation',
        severity: 'medium',
        statusLabel: 'Metadata Issue',
    },
];

export const securityStatus: SecurityStatus = {
    mfaEnabledAccounts: 3,
    mfaEligibleAccounts: 3,
    recentFailedLogins: 2,
    lockedAccounts: 0,
    securityAlerts: 1,
};

export const quickManagementActions: QuickManagementAction[] = [
    {
        id: 'create-new-agency',
        label: 'Create New Agency',
        route: '/admin/agencies',
        icon: 'building',
    },
    {
        id: 'manage-admin-users',
        label: 'Manage Admin Users',
        route: '/admin/agency-admin-users',
        icon: 'users',
    },
    {
        id: 'view-system-research',
        label: 'View System Research',
        route: '/admin/system-research',
        icon: 'file-text',
    },
    {
        id: 'open-activity-logs',
        label: 'Open Activity Logs',
        route: '/admin/system-activity',
        icon: 'activity',
    },
    {
        id: 'manage-rbac-roles',
        label: 'Manage RBAC Roles',
        route: '/admin/rbac',
        icon: 'shield',
    },
    {
        id: 'open-security-center',
        label: 'Open Security Center',
        route: '/admin/security-center',
        icon: 'lock',
    },
];
