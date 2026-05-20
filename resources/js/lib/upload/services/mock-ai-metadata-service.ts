import { mockExtractedMetadata } from '@/lib/agency/upload-research-service';
import type { MetadataField, UploadFileMock } from '@/types/agency-upload';

export type ExtractResearchMetadataRequest = {
    file: UploadFileMock | null;
    manualTitle: string;
};

export async function extractResearchMetadata({
    manualTitle,
}: ExtractResearchMetadataRequest): Promise<MetadataField[]> {
    await new Promise((resolve) => window.setTimeout(resolve, 350));

    return mockExtractedMetadata.map((field) =>
        field.key === 'title' && manualTitle.trim()
            ? { ...field, value: manualTitle.trim() }
            : { ...field },
    );
}
