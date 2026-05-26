import {
    mockAdminAgencies,
    mockAgencyAdminOptions,
} from '@/data/mock-admin-agencies';
import { fetchApi } from '@/lib/api-client';
import type {
    AgencyAdminAssignment,
    AgencyAdminOption,
    CreateAgencyPayload,
    ManagedAgency,
    UpdateAgencyPayload,
} from '@/types/admin-agencies';

type AdminAgencyApiRecord = {
    id: number;
    name: string;
    short_name?: string | null;
    type?: string | null;
    description?: string | null;
    website?: string | null;
    email?: string | null;
    address?: string | null;
    total_research: number;
    status: string;
    agency_admins?: Array<{
        id: number;
        name: string;
        email: string;
    }>;
    created_at?: string | null;
    updated_at?: string | null;
};

type AdminUserApiRecord = {
    id: number;
    name: string;
    email: string;
    agency_id?: number | null;
    status: string;
};

const mockNetworkDelay = (duration = 180) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

let agencies = mockAdminAgencies.map((agency) => ({ ...agency }));
let agencyAdmins = mockAgencyAdminOptions.map((admin) => ({ ...admin }));

function cloneAgency(agency: ManagedAgency): ManagedAgency {
    return {
        ...agency,
        agencyAdmin: agency.agencyAdmin ? { ...agency.agencyAdmin } : undefined,
    };
}

function cloneAgencies() {
    return agencies.map(cloneAgency);
}

function normalizeSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function getAdminAssignment(
    adminUserId: string | undefined,
    agencyId: string,
): AgencyAdminAssignment | undefined {
    if (!adminUserId) {
        return undefined;
    }

    const admin = agencyAdmins.find(
        (item) => item.id === adminUserId && item.status === 'active',
    );

    if (!admin) {
        throw new Error('Selected agency admin is not available.');
    }

    if (admin.assignedAgencyId && admin.assignedAgencyId !== agencyId) {
        throw new Error('Selected agency admin is already assigned.');
    }

    return {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
    };
}

function setAssignedAgency(adminUserId: string | undefined, agencyId: string) {
    agencyAdmins = agencyAdmins.map((admin) =>
        admin.id === adminUserId
            ? { ...admin, assignedAgencyId: agencyId }
            : admin.assignedAgencyId === agencyId
              ? { ...admin, assignedAgencyId: undefined }
              : admin,
    );
}

export async function getAgencies() {
    try {
        const { data } =
            await fetchApi<AdminAgencyApiRecord[]>('/api/admin/agencies');

        return data.map(mapAgencyFromApi);
    } catch {
        await mockNetworkDelay();

        return cloneAgencies();
    }
}

export async function getAgencyById(id: string) {
    try {
        const { data } = await fetchApi<AdminAgencyApiRecord>(
            `/api/admin/agencies/${id}`,
        );

        return mapAgencyFromApi(data);
    } catch {
        await mockNetworkDelay();

        const agency = agencies.find((item) => item.id === id);

        return agency ? cloneAgency(agency) : null;
    }
}

export async function getAgencyAdminOptions(): Promise<AgencyAdminOption[]> {
    try {
        const { data } = await fetchApi<AdminUserApiRecord[]>(
            '/api/admin/users?role=agency_admin&per_page=100',
        );

        return data.map((admin) => ({
            id: String(admin.id),
            fullName: admin.name,
            email: admin.email,
            status: admin.status === 'active' ? 'active' : 'inactive',
            assignedAgencyId: admin.agency_id ? String(admin.agency_id) : undefined,
        }));
    } catch {
        await mockNetworkDelay();

        return agencyAdmins.map((admin) => ({ ...admin }));
    }
}

export async function createAgency(
    payload: CreateAgencyPayload,
): Promise<ManagedAgency> {
    await mockNetworkDelay(260);

    const now = new Date().toISOString();
    const idBase = normalizeSlug(payload.shortName || payload.name);
    const id = agencies.some((agency) => agency.id === idBase)
        ? `${idBase}-${Date.now()}`
        : idBase;
    const agencyAdmin = getAdminAssignment(payload.agencyAdminId, id);

    const createdAgency: ManagedAgency = {
        id,
        name: payload.name.trim(),
        shortName: payload.shortName.trim().toUpperCase(),
        type: payload.type,
        description: payload.description?.trim() || undefined,
        website: payload.website?.trim() || undefined,
        contactEmail: payload.contactEmail?.trim().toLowerCase() || undefined,
        officeAddress: payload.officeAddress?.trim() || undefined,
        agencyAdmin,
        totalResearch: 0,
        status: payload.status,
        lastUpdated: now,
        createdAt: now,
        updatedAt: now,
    };

    agencies = [createdAgency, ...agencies];
    setAssignedAgency(payload.agencyAdminId, createdAgency.id);

    return cloneAgency(createdAgency);
}

export async function updateAgency(
    id: string,
    payload: UpdateAgencyPayload,
): Promise<ManagedAgency> {
    await mockNetworkDelay(240);

    const existingAgency = agencies.find((agency) => agency.id === id);

    if (!existingAgency) {
        throw new Error('Agency could not be updated.');
    }

    const agencyAdmin = getAdminAssignment(payload.agencyAdminId, id);
    const updatedAgency: ManagedAgency = {
        ...existingAgency,
        name: payload.name.trim(),
        shortName: payload.shortName.trim().toUpperCase(),
        type: payload.type,
        description: payload.description?.trim() || undefined,
        website: payload.website?.trim() || undefined,
        contactEmail: payload.contactEmail?.trim().toLowerCase() || undefined,
        officeAddress: payload.officeAddress?.trim() || undefined,
        agencyAdmin,
        status: payload.status,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    agencies = agencies.map((agency) =>
        agency.id === id ? updatedAgency : agency,
    );
    setAssignedAgency(payload.agencyAdminId, id);

    return cloneAgency(updatedAgency);
}

export async function activateAgency(id: string) {
    const agency = await getAgencyById(id);

    if (!agency) {
        throw new Error('Agency was not found.');
    }

    const updatedAgency = {
        ...agency,
        status: 'active' as const,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    agencies = agencies.map((item) => (item.id === id ? updatedAgency : item));

    return cloneAgency(updatedAgency);
}

export async function deactivateAgency(id: string) {
    const agency = await getAgencyById(id);

    if (!agency) {
        throw new Error('Agency was not found.');
    }

    const updatedAgency = {
        ...agency,
        status: 'inactive' as const,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    agencies = agencies.map((item) => (item.id === id ? updatedAgency : item));

    return cloneAgency(updatedAgency);
}

export async function assignAgencyAdmin(agencyId: string, adminUserId: string) {
    const agency = await getAgencyById(agencyId);

    if (!agency) {
        throw new Error('Agency was not found.');
    }

    const agencyAdmin = getAdminAssignment(adminUserId, agencyId);
    const updatedAgency = {
        ...agency,
        agencyAdmin,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    agencies = agencies.map((item) =>
        item.id === agencyId ? updatedAgency : item,
    );
    setAssignedAgency(adminUserId, agencyId);

    return cloneAgency(updatedAgency);
}

export async function archiveAgency(id: string) {
    await mockNetworkDelay(260);

    const agency = agencies.find((item) => item.id === id);

    if (!agency) {
        throw new Error('Agency was not found.');
    }

    return {
        id,
        archivedAt: new Date().toISOString(),
    };
}

function mapAgencyFromApi(agency: AdminAgencyApiRecord): ManagedAgency {
    const agencyAdmin = agency.agency_admins?.[0];

    return {
        id: String(agency.id),
        name: agency.name,
        shortName: agency.short_name ?? agency.name,
        type: mapAgencyType(agency.type),
        description: agency.description ?? undefined,
        website: agency.website ?? undefined,
        contactEmail: agency.email ?? undefined,
        officeAddress: agency.address ?? undefined,
        agencyAdmin: agencyAdmin
            ? {
                  id: String(agencyAdmin.id),
                  fullName: agencyAdmin.name,
                  email: agencyAdmin.email,
              }
            : undefined,
        totalResearch: agency.total_research,
        status: agency.status === 'active' ? 'active' : 'inactive',
        lastUpdated: agency.updated_at ?? agency.created_at ?? new Date().toISOString(),
        createdAt: agency.created_at ?? new Date().toISOString(),
        updatedAt: agency.updated_at ?? undefined,
    };
}

function mapAgencyType(type?: string | null): ManagedAgency['type'] {
    const normalized = (type ?? '').toLowerCase();

    if (normalized.includes('higher')) {
        return 'higher-education-institution';
    }

    if (normalized.includes('consortium')) {
        return 'research-consortium';
    }

    if (normalized.includes('industry')) {
        return 'industry-partner';
    }

    if (normalized.includes('government')) {
        return 'government-agency';
    }

    return 'other';
}
