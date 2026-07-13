export type AgencyResearchSummary = {
    totalResearchPublications: number;
    publishedResearch: number;
    draftResearch: number;
};

export type AgencyProfile = {
    id: string;
    name: string;
    shortName: string;
    description: string;
    website: string;
    contactEmail: string;
    officeAddress: string;
    logoPath?: string | null;
    logoUrl?: string | null;
    logo_path?: string | null;
    logo_url?: string | null;
    slug: string;
    researchSummary: AgencyResearchSummary;
    updatedAt?: string;
};

export type AgencyProfileFormValues = {
    agencyName: string;
    agencyShortName: string;
    agencyDescription: string;
    agencyWebsite: string;
    agencyContactEmail: string;
    agencyOfficeAddress: string;
};

export type AgencyProfileUpdatePayload = AgencyProfileFormValues;

export type AgencyLogoUploadStatus =
    | 'idle'
    | 'selected'
    | 'uploading'
    | 'uploaded'
    | 'removed'
    | 'error';

export type AgencyLogoState = {
    logoFile: File | null;
    logoUrl?: string | null;
    logoPreviewUrl?: string;
    logoUploadStatus: AgencyLogoUploadStatus;
    error?: string;
};

export type AgencyLogoUploadResult = AgencyProfile & {
    logoUrl: string;
    fileName: string;
    uploadedAt: string;
};
