import { Eye } from 'lucide-react';
import { metadataFieldLabels } from '@/lib/upload/report-workflow';
import type {
    ReportAIMetadataData,
    ReportMetadataKey,
} from '@/types/upload/reportWorkflow';

type MetadataLivePreviewProps = {
    metadata: ReportAIMetadataData;
};

function getMetadataValue(
    metadata: ReportAIMetadataData,
    key: ReportMetadataKey,
) {
    const value = metadata.extractedMetadata[key];

    return Array.isArray(value) ? value.join(', ') : value;
}

export default function MetadataLivePreview({
    metadata,
}: MetadataLivePreviewProps) {
    return (
        <section className="rounded-[14px] border border-[#bfdbfe] bg-[#f8faff] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                <Eye className="size-4" />
                Public Repository Preview
            </div>
            <div className="space-y-3">
                {metadata.selectedPublicMetadata.map((key) => (
                    <div key={key}>
                        <p className="text-[10px] font-bold text-[#99a1af] uppercase">
                            {metadataFieldLabels[key]}
                        </p>
                        <p className="line-clamp-3 text-xs leading-5 text-[#4a5565]">
                            {getMetadataValue(metadata, key) || 'Not provided'}
                        </p>
                    </div>
                ))}
                {metadata.selectedPublicMetadata.length === 0 ? (
                    <p className="text-xs text-[#99a1af]">
                        Select public fields to preview repository display.
                    </p>
                ) : null}
            </div>
        </section>
    );
}
