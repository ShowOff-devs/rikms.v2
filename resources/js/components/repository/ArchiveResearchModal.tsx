import { Archive } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { RepositoryItem } from '@/types/repository';

export function ArchiveResearchModal({
    item,
    open,
    isArchiving,
    onOpenChange,
    onConfirm,
}: {
    item: RepositoryItem | null;
    open: boolean;
    isArchiving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[16px] border-[#e5e7eb] bg-white sm:max-w-[460px]">
                <DialogHeader>
                    <span className="mb-2 flex size-11 items-center justify-center rounded-[14px] bg-[#fff7ed] text-[#ca3500]">
                        <Archive className="size-5" />
                    </span>
                    <DialogTitle className="text-xl font-bold text-[#101828]">
                        Move Research to Archive?
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-5 text-[#6a7282]">
                        This research will be removed from the active repository
                        and moved to the Archive module. You can restore it
                        later from the Archive page.
                    </DialogDescription>
                </DialogHeader>

                {item ? (
                    <div className="rounded-[12px] border border-[#fee685] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#92400e]">
                        {item.title}
                    </div>
                ) : null}

                <DialogFooter>
                    <button
                        type="button"
                        disabled={isArchiving}
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#4a5565] disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isArchiving}
                        onClick={onConfirm}
                        className="h-10 rounded-[10px] bg-[#ca3500] px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {isArchiving ? 'Archiving...' : 'Confirm Archive'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
