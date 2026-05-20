import { Check, Eye, Pencil } from 'lucide-react';
import { metadataFieldLabels } from '@/lib/upload/report-workflow';
import { cn } from '@/lib/utils';
import type {
    ReportAIMetadataData,
    ReportMetadataKey,
} from '@/types/upload/reportWorkflow';

type MetadataSectionCardProps = {
    fieldKey: ReportMetadataKey;
    metadata: ReportAIMetadataData;
    onValueChange: (key: ReportMetadataKey, value: string) => void;
    onVisibilityToggle: (key: ReportMetadataKey) => void;
};

function getValue(metadata: ReportAIMetadataData, key: ReportMetadataKey) {
    const value = metadata.extractedMetadata[key];

    return Array.isArray(value) ? value.join(', ') : value;
}

export default function MetadataSectionCard({
    fieldKey,
    metadata,
    onValueChange,
    onVisibilityToggle,
}: MetadataSectionCardProps) {
    const isPublic = metadata.selectedPublicMetadata.includes(fieldKey);
    const wasEdited = metadata.userEditedFields.includes(fieldKey);
    const isArrayField = fieldKey === 'keywords' || fieldKey === 'authors';

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#101828]">
                        {metadataFieldLabels[fieldKey]}
                    </h3>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            wasEdited
                                ? 'bg-[#fffbeb] text-[#d97706]'
                                : 'bg-[#f5f3ff] text-[#7c3aed]',
                        )}
                    >
                        {wasEdited ? (
                            <Pencil className="size-3" />
                        ) : (
                            <Check className="size-3" />
                        )}
                        {wasEdited ? 'User Edited' : 'AI Generated'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => onVisibilityToggle(fieldKey)}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                        isPublic
                            ? 'border-[#1e3a8a] bg-[#eff6ff] text-[#1e3a8a]'
                            : 'border-[#e5e7eb] text-[#6a7282]',
                    )}
                >
                    <Eye className="size-3.5" />
                    {isPublic ? 'Public' : 'Private'}
                </button>
            </div>
            {isArrayField ? (
                <input
                    value={getValue(metadata, fieldKey)}
                    onChange={(event) =>
                        onValueChange(fieldKey, event.target.value)
                    }
                    className="h-10 w-full rounded-[10px] border border-[#d1d5dc] px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                />
            ) : (
                <textarea
                    value={getValue(metadata, fieldKey)}
                    onChange={(event) =>
                        onValueChange(fieldKey, event.target.value)
                    }
                    rows={fieldKey === 'title' ? 2 : 4}
                    className="w-full rounded-[10px] border border-[#d1d5dc] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                />
            )}
        </section>
    );
}
