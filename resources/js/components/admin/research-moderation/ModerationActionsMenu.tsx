import {
    Archive,
    CheckCircle2,
    Eye,
    Flag,
    MoreVertical,
    Send,
    Undo2,
    SearchCheck,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllowedResearchModerationActions } from '@/lib/admin/research-moderation-actions';
import type { FlaggedResearchRecord } from '@/types/research-moderation';

type ModerationActionsMenuProps = {
    record: FlaggedResearchRecord;
    onView: (record: FlaggedResearchRecord) => void;
    onReview: (record: FlaggedResearchRecord) => void;
    onResolve: (record: FlaggedResearchRecord) => void;
    onPublish: (record: FlaggedResearchRecord) => void;
    onFlag: (record: FlaggedResearchRecord) => void;
    onReturnToDraft: (record: FlaggedResearchRecord) => void;
    onArchive: (record: FlaggedResearchRecord) => void;
};

export function ModerationActionsMenu({
    record,
    onView,
    onReview,
    onResolve,
    onPublish,
    onFlag,
    onReturnToDraft,
    onArchive,
}: ModerationActionsMenuProps) {
    const allowedActions = getAllowedResearchModerationActions(record);

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
                {allowedActions.has('approve') ? (
                    <DropdownMenuItem onSelect={() => onResolve(record)}>
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Approve Research
                    </DropdownMenuItem>
                ) : null}
                {allowedActions.has('publish') ? (
                    <DropdownMenuItem onSelect={() => onPublish(record)}>
                        <Send className="size-4" aria-hidden="true" />
                        Publish Research
                    </DropdownMenuItem>
                ) : null}
                {allowedActions.has('flag_for_review') ? (
                    <DropdownMenuItem onSelect={() => onFlag(record)}>
                        <Flag className="size-4" aria-hidden="true" />
                        Flag for Review
                    </DropdownMenuItem>
                ) : null}
                {allowedActions.has('return_to_draft') ? (
                    <DropdownMenuItem onSelect={() => onReturnToDraft(record)}>
                        <Undo2 className="size-4" aria-hidden="true" />
                        Return to Draft
                    </DropdownMenuItem>
                ) : null}
                {allowedActions.has('archive') ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onArchive(record)}
                        >
                            <Archive className="size-4" aria-hidden="true" />
                            Archive Research
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
