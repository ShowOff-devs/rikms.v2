import { fetchApi } from '@/lib/api-client';
import type {
    AgencyLogoUploadResult,
    AgencyProfile,
    AgencyProfileUpdatePayload,
    AgencyResearchSummary,
} from '@/types/agency-profile';

export async function getAgencyProfile(agencyId?: string) {
    const { data } = await fetchApi<AgencyProfile>('/api/agency/profile');

    if (agencyId && data.slug !== agencyId && data.id !== agencyId) {
        return null;
    }

    return data;
}

export async function updateAgencyProfile(payload: AgencyProfileUpdatePayload) {
    const { data } = await fetchApi<AgencyProfile>('/api/agency/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });

    return data;
}

export async function uploadAgencyLogo(
    file: File,
): Promise<AgencyLogoUploadResult> {
    const formData = new FormData();

    formData.append('logo', file);

    const { data } = await fetchApi<AgencyLogoUploadResult>(
        '/api/agency/profile/logo',
        {
            method: 'POST',
            body: formData,
        },
    );

    return data;
}

export async function removeAgencyLogo() {
    const { data } = await fetchApi<{ success: boolean }>(
        '/api/agency/profile/logo',
        {
            method: 'DELETE',
        },
    );

    return data;
}

export async function getAgencyResearchSummary(): Promise<AgencyResearchSummary> {
    const profile = await getAgencyProfile();

    if (!profile) {
        throw new Error('Unable to load agency research summary.');
    }

    return profile.researchSummary;
}
