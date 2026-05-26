export type AgencyAdminUserStatus = 'active' | 'inactive';

export type AgencyAdminUserRole = 'Agency Admin';

export type Agency = {
    id: string;
    name: string;
    shortName: string;
};

export type AgencyAdminUser = {
    id: string;
    fullName: string;
    email: string;
    agencyId: string;
    agencyName: string;
    agencyShortName: string;
    role: AgencyAdminUserRole;
    status: AgencyAdminUserStatus;
    lastLogin?: string;
    avatarInitials: string;
    createdAt: string;
    updatedAt?: string;
};

export type CreateAgencyAdminUserPayload = {
    fullName: string;
    email: string;
    agencyId: string;
    role: AgencyAdminUserRole;
    status: AgencyAdminUserStatus;
    sendInvite: boolean;
    temporaryPassword?: string;
};

export type UpdateAgencyAdminUserPayload = {
    fullName: string;
    email: string;
    agencyId: string;
    status: AgencyAdminUserStatus;
};
