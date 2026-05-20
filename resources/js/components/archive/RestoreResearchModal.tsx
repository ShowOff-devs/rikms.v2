import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ArchivedResearch } from '@/types/archive';

type RestoreResearchModalProps = {
    record: ArchivedResearch | null;
    open: boolean;
    isLoading: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function RestoreResearchModal({
    record,
    open,
    isLoading,
    onOpenChange,
    onConfirm,
}: RestoreResearchModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#1e3a8a]">
                        Restore Research?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This research will be moved back to the active Research
                        Repository.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <p className="text-sm font-semibold text-[#1e2939]">
                        {record.title}
                    </p>
                    <p className="mt-1 text-xs text-[#6a7282]">
                        Archived by {record.archivedBy}
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
                        className="h-9 rounded-[8px] bg-[#00a63e] px-4 text-sm font-medium text-white hover:bg-[#008236] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoading ? 'Restoring...' : 'Restore'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
