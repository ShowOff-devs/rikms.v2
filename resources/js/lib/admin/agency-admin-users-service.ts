import { fetchApi } from '@/lib/api-client';
import type {
    Agency,
    AgencyAdminUser,
    CreateAgencyAdminUserPayload,
    UpdateAgencyAdminUserPayload,
} from '@/types/admin-users';

type AdminAgencyApiRecord = {
    id: number;
    name: string;
    short_name?: string | null;
};

type AdminAgencyAdminUserApiRecord = {
    id: number;
    agency_id?: number | null;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    role: string;
    roles?: string[];
    status: string;
    agency?: AdminAgencyApiRecord | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type PasswordResetApiRecord = {
    id: number;
    sent_to: string;
    sent_at: string;
};

type RemovedAgencyAdminApiRecord = {
    id: number;
    removed_at: string;
};

function getInitials(fullName: string) {
    return fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((namePart) => namePart.charAt(0).toUpperCase())
        .join('');
}

export async function getAgencies(): Promise<Agency[]> {
    const { data } = await fetchApi<AdminAgencyApiRecord[]>(
        '/api/admin/agencies?per_page=100',
    );

    return data.map((agency) => ({
        id: String(agency.id),
        name: agency.name,
        shortName: agency.short_name ?? agency.name,
    }));
}

export async function getAgencyAdminUsers(): Promise<AgencyAdminUser[]> {
    const { data } = await fetchApi<AdminAgencyAdminUserApiRecord[]>(
        '/api/admin/agency-admin-users?per_page=100',
    );

    return data.map(mapAgencyAdminUserFromApi);
}

export async function getAgencyAdminUserById(
    id: string,
): Promise<AgencyAdminUser | null> {
    const { data } = await fetchApi<AdminAgencyAdminUserApiRecord>(
        `/api/admin/agency-admin-users/${id}`,
    );

    return mapAgencyAdminUserFromApi(data);
}

export async function createAgencyAdminUser(
    payload: CreateAgencyAdminUserPayload,
): Promise<AgencyAdminUser> {
    const { data } = await fetchApi<AdminAgencyAdminUserApiRecord>(
        '/api/admin/agency-admin-users',
        {
            method: 'POST',
            body: JSON.stringify({
                full_name: payload.fullName.trim(),
                email: payload.email.trim().toLowerCase(),
                agency_id: Number(payload.agencyId),
                status: payload.status,
                send_invite: payload.sendInvite,
                temporary_password:
                    payload.temporaryPassword?.trim() || undefined,
            }),
        },
    );

    return mapAgencyAdminUserFromApi(data);
}

export async function updateAgencyAdminUser(
    id: string,
    payload: UpdateAgencyAdminUserPayload,
): Promise<AgencyAdminUser> {
    const { data } = await fetchApi<AdminAgencyAdminUserApiRecord>(
        `/api/admin/agency-admin-users/${id}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                full_name: payload.fullName.trim(),
                email: payload.email.trim().toLowerCase(),
                agency_id: Number(payload.agencyId),
                status: payload.status,
            }),
        },
    );

    return mapAgencyAdminUserFromApi(data);
}

export async function activateAgencyAdminUser(id: string) {
    const { data } = await fetchApi<AdminAgencyAdminUserApiRecord>(
        `/api/admin/agency-admin-users/${id}/activate`,
        { method: 'POST' },
    );

    return mapAgencyAdminUserFromApi(data);
}

export async function deactivateAgencyAdminUser(id: string) {
    const { data } = await fetchApi<AdminAgencyAdminUserApiRecord>(
        `/api/admin/agency-admin-users/${id}/deactivate`,
        { method: 'POST' },
    );

    return mapAgencyAdminUserFromApi(data);
}

export async function resetAgencyAdminPassword(id: string) {
    const { data } = await fetchApi<PasswordResetApiRecord>(
        `/api/admin/agency-admin-users/${id}/password-reset`,
        { method: 'POST' },
    );

    return {
        id: String(data.id),
        sentTo: data.sent_to,
        sentAt: data.sent_at,
    };
}

export async function removeAgencyAdminUser(id: string) {
    const { data } = await fetchApi<RemovedAgencyAdminApiRecord>(
        `/api/admin/agency-admin-users/${id}`,
        { method: 'DELETE' },
    );

    return {
        id: String(data.id),
        removedAt: data.removed_at,
    };
}

function mapAgencyAdminUserFromApi(
    user: AdminAgencyAdminUserApiRecord,
): AgencyAdminUser {
    const fullName =
        user.name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ');
    const agencyName = user.agency?.name ?? 'Unassigned Agency';
    const agencyShortName = user.agency?.short_name ?? agencyName;

    return {
        id: String(user.id),
        fullName,
        email: user.email,
        agencyId: user.agency_id ? String(user.agency_id) : '',
        agencyName,
        agencyShortName,
        role: 'Agency Admin',
        status: user.status === 'active' ? 'active' : 'inactive',
        avatarInitials: getInitials(fullName),
        createdAt: user.created_at ?? new Date().toISOString(),
        updatedAt: user.updated_at ?? undefined,
    };
}
