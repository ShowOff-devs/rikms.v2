import type { MetadataField } from '@/types/agency-upload';

export async function suggestResearchSdgs(
    metadata: MetadataField[],
): Promise<number[]> {
    await new Promise((resolve) => window.setTimeout(resolve, 200));

    const text = metadata
        .map((field) => field.value)
        .join(' ')
        .toLowerCase();

    if (text.includes('climate') || text.includes('environment')) {
        return [13, 9, 17];
    }

    return [9, 8, 17];
}
