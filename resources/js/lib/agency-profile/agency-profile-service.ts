import { mockAgencyProfile } from '@/data/mock-agency-profile';
// TODO Phase 8/9: Replace this mock fallback after the real protected API and browser QA are complete.
import type {
    AgencyLogoUploadResult,
    AgencyProfile,
    AgencyProfileUpdatePayload,
    AgencyResearchSummary,
} from '@/types/agency-profile';

let currentAgencyProfile: AgencyProfile = mockAgencyProfile;

const mockNetworkDelay = (duration = 220) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read logo file.'));
        reader.readAsDataURL(file);
    });

export async function getAgencyProfile(agencyId?: string) {
    await mockNetworkDelay();

    if (agencyId && agencyId !== currentAgencyProfile.id) {
        return null;
    }

    return currentAgencyProfile;
}

export async function updateAgencyProfile(payload: AgencyProfileUpdatePayload) {
    await mockNetworkDelay(320);

    currentAgencyProfile = {
        ...currentAgencyProfile,
        name: payload.agencyName,
        shortName: payload.agencyShortName,
        description: payload.agencyDescription,
        website: payload.agencyWebsite,
        contactEmail: payload.agencyContactEmail,
        officeAddress: payload.agencyOfficeAddress,
        logoUrl: payload.logoUrl,
        updatedAt: new Date().toISOString(),
    };

    return currentAgencyProfile;
}

export async function uploadAgencyLogo(
    file: File,
): Promise<AgencyLogoUploadResult> {
    await mockNetworkDelay(280);

    return {
        logoUrl: await fileToDataUrl(file),
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
    };
}

export async function removeAgencyLogo() {
    await mockNetworkDelay(180);

    return { success: true };
}

export async function getAgencyResearchSummary(): Promise<AgencyResearchSummary> {
    await mockNetworkDelay();

    return currentAgencyProfile.researchSummary;
}
