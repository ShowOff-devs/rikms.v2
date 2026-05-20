import { RotateCcw, Trash2 } from 'lucide-react';
import type { ArchivedResearch } from '@/types/archive';

type ArchivedResearchActionsProps = {
    record: ArchivedResearch;
    onRestore: (record: ArchivedResearch) => void;
    onDelete: (record: ArchivedResearch) => void;
};

export function ArchivedResearchActions({
    record,
    onRestore,
    onDelete,
}: ArchivedResearchActionsProps) {
    return (
        <div className="flex items-center justify-end gap-2">
            <button
                type="button"
                onClick={() => onRestore(record)}
                className="inline-flex h-[26px] items-center gap-1 rounded-[8px] border border-[#b9f8cf] bg-[#f0fdf4] px-2.5 text-[11px] font-medium text-[#00a63e] hover:bg-[#dcfce7]"
            >
                <RotateCcw className="size-3" />
                Restore
            </button>
            <button
                type="button"
                onClick={() => onDelete(record)}
                className="inline-flex h-[26px] items-center gap-1 rounded-[8px] border border-[#ffc9c9] bg-[#fff1f2] px-2.5 text-[11px] font-medium text-[#fb2c36] hover:bg-[#ffe2e2]"
            >
                <Trash2 className="size-3" />
                Delete
            </button>
        </div>
    );
}
