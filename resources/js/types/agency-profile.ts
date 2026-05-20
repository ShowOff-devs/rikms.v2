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
    logoUrl?: string;
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

export type AgencyProfileUpdatePayload = AgencyProfileFormValues & {
    logoUrl?: string;
};

export type AgencyLogoUploadStatus =
    | 'idle'
    | 'selected'
    | 'uploading'
    | 'uploaded'
    | 'removed'
    | 'error';

export type AgencyLogoState = {
    logoFile: File | null;
    logoUrl?: string;
    logoPreviewUrl?: string;
    logoUploadStatus: AgencyLogoUploadStatus;
    error?: string;
};

export type AgencyLogoUploadResult = {
    logoUrl: string;
    fileName: string;
    uploadedAt: string;
};
