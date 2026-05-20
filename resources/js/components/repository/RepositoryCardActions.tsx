import { Archive, Edit3, Eye, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RepositoryItem } from '@/types/repository';

export function RepositoryCardActions({
    item,
    onView,
    onEdit,
    onArchive,
}: {
    item: RepositoryItem;
    onView: (item: RepositoryItem) => void;
    onEdit: (item: RepositoryItem) => void;
    onArchive: (item: RepositoryItem) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`More options for ${item.title}`}
                    className="flex size-[30px] items-center justify-center rounded-[10px] text-[#99a1af] hover:bg-[#f3f4f6] hover:text-[#1e3a8a]"
                >
                    <MoreHorizontal className="size-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[168px] rounded-[12px] border-[#e5e7eb] bg-white p-1.5 shadow-[0px_10px_30px_rgba(15,23,42,0.14)]"
            >
                <DropdownMenuItem
                    onClick={() => onView(item)}
                    className="h-9 cursor-pointer rounded-[8px] text-sm text-[#364153] focus:bg-[#eff6ff] focus:text-[#1e3a8a]"
                >
                    <Eye className="size-4" />
                    View
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onEdit(item)}
                    className="h-9 cursor-pointer rounded-[8px] text-sm text-[#364153] focus:bg-[#eff6ff] focus:text-[#1e3a8a]"
                >
                    <Edit3 className="size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#f3f4f6]" />
                <DropdownMenuItem
                    onClick={() => onArchive(item)}
                    className="h-9 cursor-pointer rounded-[8px] text-sm text-[#ca3500] focus:bg-[#fff7ed] focus:text-[#ca3500]"
                >
                    <Archive className="size-4" />
                    Archive
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
