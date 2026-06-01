import { fetchApi } from '@/lib/api-client';
import type { AgencyUploadState, UploadFileMock } from '@/types/agency-upload';

export type AgencyResearchFileRecord = {
    id: number;
    research_id: number;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    status: string;
    uploaded_at?: string | null;
};

export async function uploadAgencyResearchFile(
    researchId: string | number,
    file: File,
    state: AgencyUploadState,
): Promise<UploadFileMock> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', 'research_document');
    formData.append(
        'access_level',
        state.accessType === 'public' ? 'public' : 'restricted',
    );
    formData.append(
        'visibility',
        state.accessType === 'public' ? 'public' : 'private',
    );

    const { data } = await fetchApi<AgencyResearchFileRecord>(
        `/api/agency/research/${researchId}/files`,
        {
            method: 'POST',
            body: formData,
        },
    );

    return {
        id: String(data.id),
        researchId: String(data.research_id),
        name: data.original_name,
        size: data.size_bytes,
        type: data.mime_type,
    };
}
