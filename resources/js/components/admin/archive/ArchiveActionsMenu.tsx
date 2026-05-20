import { Eye, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdminArchivedRecord } from '@/types/admin-archive';

type ArchiveActionsMenuProps = {
    record: AdminArchivedRecord;
    onView: (record: AdminArchivedRecord) => void;
    onRestore: (record: AdminArchivedRecord) => void;
    onDelete: (record: AdminArchivedRecord) => void;
};

function getRecordName(record: AdminArchivedRecord) {
    if (record.type === 'research') {
        return record.title;
    }

    if (record.type === 'agency') {
        return record.name;
    }

    return record.fullName;
}

function getRestoreLabel(record: AdminArchivedRecord) {
    if (record.type === 'agency') {
        return 'Restore Agency';
    }

    if (record.type === 'user') {
        return 'Restore User';
    }

    return 'Restore';
}

export function ArchiveActionsMenu({
    record,
    onView,
    onRestore,
    onDelete,
}: ArchiveActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                    aria-label={`Open actions for ${getRecordName(record)}`}
                >
                    <MoreVertical className="size-4" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => onView(record)}>
                    <Eye className="size-4" aria-hidden="true" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onRestore(record)}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    {getRestoreLabel(record)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(record)}
                >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete Permanently
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
