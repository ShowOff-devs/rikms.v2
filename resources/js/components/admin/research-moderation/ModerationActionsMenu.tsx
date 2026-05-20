import {
    Archive,
    CheckCircle2,
    Eye,
    Flag,
    MoreVertical,
    SearchCheck,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FlaggedResearchRecord } from '@/types/research-moderation';

type ModerationActionsMenuProps = {
    record: FlaggedResearchRecord;
    onView: (record: FlaggedResearchRecord) => void;
    onReview: (record: FlaggedResearchRecord) => void;
    onResolve: (record: FlaggedResearchRecord) => void;
    onFlag: (record: FlaggedResearchRecord) => void;
    onArchive: (record: FlaggedResearchRecord) => void;
};

export function ModerationActionsMenu({
    record,
    onView,
    onReview,
    onResolve,
    onFlag,
    onArchive,
}: ModerationActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                    aria-label={`Open actions for ${record.title}`}
                >
                    <MoreVertical className="size-4" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => onView(record)}>
                    <Eye className="size-4" aria-hidden="true" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onReview(record)}>
                    <SearchCheck className="size-4" aria-hidden="true" />
                    Review Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onResolve(record)}>
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Mark as Resolved
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onFlag(record)}>
                    <Flag className="size-4" aria-hidden="true" />
                    Flag for Review
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onArchive(record)}
                >
                    <Archive className="size-4" aria-hidden="true" />
                    Archive Research
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
