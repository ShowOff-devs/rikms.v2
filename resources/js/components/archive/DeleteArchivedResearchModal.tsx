import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ArchivedResearch } from '@/types/archive';

type DeleteArchivedResearchModalProps = {
    record: ArchivedResearch | null;
    open: boolean;
    isLoading: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteArchivedResearchModal({
    record,
    open,
    isLoading,
    onOpenChange,
    onConfirm,
}: DeleteArchivedResearchModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#ffc9c9] bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#e7000b]">
                        Permanently Delete Research?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This action cannot be undone. The research record will
                        be permanently deleted from the archive.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[10px] border border-[#ffc9c9] bg-[#fff1f2] p-4">
                    <p className="text-sm font-semibold text-[#1e2939]">
                        {record.title}
                    </p>
                    <p className="mt-1 text-xs text-[#e7000b]">
                        Permanent deletion removes this archive entry from
                        agency recovery workflows.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="h-9 rounded-[8px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="h-9 rounded-[8px] bg-[#fb2c36] px-4 text-sm font-medium text-white hover:bg-[#e7000b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoading ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
