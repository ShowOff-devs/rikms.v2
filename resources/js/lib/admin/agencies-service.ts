import { fetchApi } from '@/lib/api-client';
import type {
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

type ArchiveAgencyApiRecord = {
    id: number;
    archived_at: string;
};

export async function getAgencies() {
    const { data } = await fetchApi<AdminAgencyApiRecord[]>(
        '/api/admin/agencies?per_page=100',
    );

    return data.map(mapAgencyFromApi);
}

export async function getAgencyById(id: string) {
    const { data } = await fetchApi<AdminAgencyApiRecord>(
        `/api/admin/agencies/${id}`,
    );

    return mapAgencyFromApi(data);
}

export async function getAgencyAdminOptions(): Promise<AgencyAdminOption[]> {
    const { data } = await fetchApi<AdminUserApiRecord[]>(
        '/api/admin/agency-admin-users?per_page=100',
    );

    return data.map((admin) => ({
        id: String(admin.id),
        fullName: admin.name,
        email: admin.email,
        status: admin.status === 'active' ? 'active' : 'inactive',
        assignedAgencyId: admin.agency_id ? String(admin.agency_id) : undefined,
    }));
}

export async function createAgency(
    payload: CreateAgencyPayload,
): Promise<ManagedAgency> {
    const { data } = await fetchApi<AdminAgencyApiRecord>(
        '/api/admin/agencies',
        {
            method: 'POST',
            body: JSON.stringify(toAgencyPayload(payload)),
        },
    );

    return mapAgencyFromApi(data);
}

export async function updateAgency(
    id: string,
    payload: UpdateAgencyPayload,
): Promise<ManagedAgency> {
    const { data } = await fetchApi<AdminAgencyApiRecord>(
        `/api/admin/agencies/${id}`,
        {
            method: 'PATCH',
            body: JSON.stringify(toAgencyPayload(payload)),
        },
    );

    return mapAgencyFromApi(data);
}

export async function activateAgency(id: string) {
    const { data } = await fetchApi<AdminAgencyApiRecord>(
        `/api/admin/agencies/${id}/activate`,
        { method: 'POST' },
    );

    return mapAgencyFromApi(data);
}

export async function deactivateAgency(id: string) {
    const { data } = await fetchApi<AdminAgencyApiRecord>(
        `/api/admin/agencies/${id}/deactivate`,
        { method: 'POST' },
    );

    return mapAgencyFromApi(data);
}

export async function assignAgencyAdmin(agencyId: string, adminUserId: string) {
    const { data } = await fetchApi<AdminAgencyApiRecord>(
        `/api/admin/agencies/${agencyId}/assign-admin`,
        {
            method: 'POST',
            body: JSON.stringify({
                admin_user_id: Number(adminUserId),
            }),
        },
    );

    return mapAgencyFromApi(data);
}

export async function archiveAgency(id: string) {
    const { data } = await fetchApi<ArchiveAgencyApiRecord>(
        `/api/admin/agencies/${id}/archive`,
        { method: 'POST' },
    );

    return {
        id: String(data.id),
        archivedAt: data.archived_at,
    };
}

function toAgencyPayload(payload: CreateAgencyPayload | UpdateAgencyPayload) {
    return {
        name: payload.name.trim(),
        short_name: payload.shortName.trim(),
        type: payload.type,
        description: payload.description?.trim() || null,
        website: payload.website?.trim() || null,
        email: payload.contactEmail?.trim().toLowerCase() || null,
        address: payload.officeAddress?.trim() || null,
        agency_admin_id: payload.agencyAdminId
            ? Number(payload.agencyAdminId)
            : null,
        status: payload.status,
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
        lastUpdated:
            agency.updated_at ?? agency.created_at ?? new Date().toISOString(),
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
