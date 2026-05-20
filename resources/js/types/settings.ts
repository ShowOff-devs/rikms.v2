export type AccountSettings = {
    fullName: string;
    emailAddress: string;
    role: string;
    agency: string;
    profilePhotoUrl?: string;
};

export type NotificationSettings = {
    notifyNewAccessRequests: boolean;
    notifyRequestApprovalsDenials: boolean;
    notifyNewResearchUploads: boolean;
    browserNotifications: boolean;
    weeklyDigest: boolean;
    monthlyAnalyticsReport: boolean;
};

export type ActiveSession = {
    id: string;
    device: string;
    browser: string;
    operatingSystem: string;
    location: string;
    isCurrent: boolean;
    status: 'active' | 'expired';
};

export type SecuritySettings = {
    twoFactorEnabled: boolean;
    sessionTimeout?: number;
    activeSessions: ActiveSession[];
};

export type AgencySettings = {
    account: AccountSettings;
    notifications: NotificationSettings;
    security: SecuritySettings;
};

export type SettingsTab = 'account' | 'notifications' | 'security';

export type PasswordChangePayload = {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
};

export type ProfilePhotoUploadResult = {
    profilePhotoUrl: string;
    fileName: string;
    uploadedAt: string;
};

export type DeactivationRequestStatus =
    | 'idle'
    | 'pending'
    | 'submitted'
    | 'failed';

export type DeactivationRequestResult = {
    status: Exclude<DeactivationRequestStatus, 'idle' | 'failed'>;
    requestedAt: string;
};
