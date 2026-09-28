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
    deactivation_requested_at?: string | null;
    last_login_at?: string | null;
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

type CreateAgencyAdminUserMeta = {
    invite_sent?: boolean;
    invite_message?: string | null;
};

type CreateAgencyAdminUserResult = {
    user: AgencyAdminUser;
    message: string;
    inviteSent: boolean;
    inviteMessage?: string | null;
};

type AgencyAdminUsersMeta = {
    pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
    summary: {
        total_users: number;
        active_users: number;
        inactive_users: number;
        recently_created: number;
    };
};

export type AgencyAdminUserListFilters = {
    page?: number;
    perPage?: number;
    keyword?: string;
    agencyId?: string;
    status?: string;
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
    const agencies: AdminAgencyApiRecord[] = [];
    let page = 1;
    let lastPage = 1;

    do {
        const response = await fetchApi<
            AdminAgencyApiRecord[],
            { pagination?: { last_page?: number } }
        >(`/api/admin/agencies?per_page=100&status=active&page=${page}`);

        agencies.push(...response.data);
        lastPage = response.meta.pagination?.last_page ?? page;
        page += 1;
    } while (page <= lastPage);

    return agencies.map((agency) => ({
        id: String(agency.id),
        name: agency.name,
        shortName: agency.short_name ?? agency.name,
    }));
}

export async function getAgencyAdminUsers(
    filters: AgencyAdminUserListFilters = {},
) {
    const params = new URLSearchParams({
        page: String(filters.page ?? 1),
        per_page: String(filters.perPage ?? 10),
    });

    if (filters.keyword?.trim()) {
        params.set('keyword', filters.keyword.trim());
    }

    if (filters.agencyId && filters.agencyId !== 'all') {
        params.set('agency_id', filters.agencyId);
    }

    if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
    }

    const { data, meta } = await fetchApi<
        AdminAgencyAdminUserApiRecord[],
        AgencyAdminUsersMeta
    >(`/api/admin/agency-admin-users?${params.toString()}`);

    return {
        users: data.map(mapAgencyAdminUserFromApi),
        pagination: meta.pagination,
        summary: {
            totalUsers: meta.summary.total_users,
            activeUsers: meta.summary.active_users,
            inactiveUsers: meta.summary.inactive_users,
            recentlyCreated: meta.summary.recently_created,
        },
    };
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
): Promise<CreateAgencyAdminUserResult> {
    const { data, message, meta } = await fetchApi<
        AdminAgencyAdminUserApiRecord,
        CreateAgencyAdminUserMeta
    >('/api/admin/agency-admin-users', {
        method: 'POST',
        body: JSON.stringify({
            full_name: payload.fullName.trim(),
            email: payload.email.trim().toLowerCase(),
            agency_id: Number(payload.agencyId),
            status: payload.status,
            send_invite: payload.sendInvite,
            temporary_password: payload.temporaryPassword?.trim() || null,
        }),
    });

    return {
        user: mapAgencyAdminUserFromApi(data),
        message,
        inviteSent: Boolean(meta.invite_sent),
        inviteMessage: meta.invite_message,
    };
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
        deactivationRequestedAt: user.deactivation_requested_at ?? null,
        lastLogin: user.last_login_at ?? undefined,
        avatarInitials: getInitials(fullName),
        createdAt: user.created_at ?? new Date().toISOString(),
        updatedAt: user.updated_at ?? undefined,
    };
}
