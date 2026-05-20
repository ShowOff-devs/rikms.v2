import {
    mockAgencies,
    mockAgencyAdminUsers,
} from '@/data/mock-agency-admin-users';
import type {
    AgencyAdminUser,
    CreateAgencyAdminUserPayload,
    UpdateAgencyAdminUserPayload,
} from '@/types/admin-users';

const mockNetworkDelay = (duration = 180) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, duration);
    });

let agencyAdminUsers = mockAgencyAdminUsers.map((user) => ({ ...user }));

function cloneUsers() {
    return agencyAdminUsers.map((user) => ({ ...user }));
}

function getAgency(agencyId: string) {
    return mockAgencies.find((agency) => agency.id === agencyId);
}

function getInitials(fullName: string) {
    return fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((namePart) => namePart.charAt(0).toUpperCase())
        .join('');
}

export async function getAgencies() {
    await mockNetworkDelay();

    return mockAgencies.map((agency) => ({ ...agency }));
}

export async function getAgencyAdminUsers() {
    await mockNetworkDelay();

    return cloneUsers();
}

export async function getAgencyAdminUserById(id: string) {
    await mockNetworkDelay();

    const user = agencyAdminUsers.find((item) => item.id === id);

    return user ? { ...user } : null;
}

export async function createAgencyAdminUser(
    payload: CreateAgencyAdminUserPayload,
): Promise<AgencyAdminUser> {
    await mockNetworkDelay(260);

    const agency = getAgency(payload.agencyId);

    if (!agency) {
        throw new Error('Assigned agency does not exist.');
    }

    const now = new Date().toISOString();

    const createdUser: AgencyAdminUser = {
        id: `agency-admin-${Date.now()}`,
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        agencyId: agency.id,
        agencyName: agency.name,
        agencyShortName: agency.shortName,
        role: 'Agency Admin',
        status: payload.status,
        avatarInitials: getInitials(payload.fullName),
        createdAt: now,
        updatedAt: now,
    };

    agencyAdminUsers = [createdUser, ...agencyAdminUsers];

    return { ...createdUser };
}

export async function updateAgencyAdminUser(
    id: string,
    payload: UpdateAgencyAdminUserPayload,
): Promise<AgencyAdminUser> {
    await mockNetworkDelay(240);

    const existingUser = agencyAdminUsers.find((user) => user.id === id);
    const agency = getAgency(payload.agencyId);

    if (!existingUser || !agency) {
        throw new Error('Agency admin user could not be updated.');
    }

    const updatedUser = {
        ...existingUser,
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        agencyId: agency.id,
        agencyName: agency.name,
        agencyShortName: agency.shortName,
        status: payload.status,
        avatarInitials: getInitials(payload.fullName),
        updatedAt: new Date().toISOString(),
    };

    agencyAdminUsers = agencyAdminUsers.map((user) =>
        user.id === id ? updatedUser : user,
    );

    return { ...updatedUser };
}

export async function activateAgencyAdminUser(id: string) {
    const user = await getAgencyAdminUserById(id);

    if (!user) {
        throw new Error('Agency admin user was not found.');
    }

    const updatedUser = {
        ...user,
        status: 'active' as const,
        updatedAt: new Date().toISOString(),
    };

    agencyAdminUsers = agencyAdminUsers.map((item) =>
        item.id === id ? updatedUser : item,
    );

    return updatedUser;
}

export async function deactivateAgencyAdminUser(id: string) {
    const user = await getAgencyAdminUserById(id);

    if (!user) {
        throw new Error('Agency admin user was not found.');
    }

    const updatedUser = {
        ...user,
        status: 'inactive' as const,
        updatedAt: new Date().toISOString(),
    };

    agencyAdminUsers = agencyAdminUsers.map((item) =>
        item.id === id ? updatedUser : item,
    );

    return updatedUser;
}

export async function resetAgencyAdminPassword(id: string) {
    await mockNetworkDelay(320);

    const user = agencyAdminUsers.find((item) => item.id === id);

    if (!user) {
        throw new Error('Agency admin user was not found.');
    }

    return {
        id,
        sentTo: user.email,
        sentAt: new Date().toISOString(),
    };
}

export async function removeAgencyAdminUser(id: string) {
    await mockNetworkDelay(260);

    agencyAdminUsers = agencyAdminUsers.filter((user) => user.id !== id);

    return {
        id,
        removedAt: new Date().toISOString(),
    };
}
