export type AgencyStatus = 'active' | 'inactive';

export type AgencyType =
    | 'government-agency'
    | 'higher-education-institution'
    | 'research-consortium'
    | 'industry-partner'
    | 'other';

export type AgencyAdminAssignment = {
    id: string;
    fullName: string;
    email: string;
};

export type ManagedAgency = {
    id: string;
    name: string;
    shortName: string;
    type: AgencyType;
    description?: string;
    website?: string;
    contactEmail?: string;
    officeAddress?: string;
    agencyAdmin?: AgencyAdminAssignment;
    totalResearch: number;
    status: AgencyStatus;
    lastUpdated: string;
    createdAt: string;
    updatedAt?: string;
};

export type AgencyAdminOption = AgencyAdminAssignment & {
    status: AgencyStatus;
    assignedAgencyId?: string;
};

export type CreateAgencyPayload = {
    name: string;
    shortName: string;
    type: AgencyType;
    description?: string;
    website?: string;
    contactEmail?: string;
    officeAddress?: string;
    agencyAdminId?: string;
    status: AgencyStatus;
};

export type UpdateAgencyPayload = CreateAgencyPayload;
