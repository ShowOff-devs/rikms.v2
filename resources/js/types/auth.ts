export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};

export type AgencyOption = {
    id: string;
    shortName: string;
    fullName: string;
    adminEmailHint: string;
};

export type AgencyLoginPayload = {
    agencyId: string;
    email: string;
    password: string;
    remember: boolean;
};

export type AgencyPasswordResetPayload = {
    agencyId: string;
    email: string;
};

export type AgencyAuthSession = {
    agencyId: string;
    agencyName: string;
    email: string;
    portal: 'agency-admin';
    remember: boolean;
    loggedInAt: string;
};
