import { Loader2, RotateCcw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AdminArchivedRecord } from '@/types/admin-archive';
import {
    formatArchivedRecordDate,
    getArchivedRecordAgency,
    getArchivedRecordTitle,
    getArchivedRecordTypeLabel,
} from './archive-record-display';

type RestoreArchivedRecordModalProps = {
    record: AdminArchivedRecord | null;
    open: boolean;
    isRestoring: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function RestoreArchivedRecordModal({
    record,
    open,
    isRestoring,
    onOpenChange,
    onConfirm,
}: RestoreArchivedRecordModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <RotateCcw className="size-5 text-[#008236]" />
                        Restore Archived Record?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This record will be restored and moved back to its
                        active module. You can manage it again after
                        restoration.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[12px] border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                    <p className="text-sm font-semibold text-[#166534]">
                        {getArchivedRecordTitle(record)}
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs text-[#4a5565]">
                        <div className="flex justify-between gap-3">
                            <dt>Record type</dt>
                            <dd className="font-medium text-[#1e2939]">
                                {getArchivedRecordTypeLabel(record)}
                            </dd>
                        </div>
                        {getArchivedRecordAgency(record) ? (
                            <div className="flex justify-between gap-3">
                                <dt>Agency</dt>
                                <dd className="font-medium text-[#1e2939]">
                                    {getArchivedRecordAgency(record)}
                                </dd>
                            </div>
                        ) : null}
                        <div className="flex justify-between gap-3">
                            <dt>Archived by</dt>
                            <dd className="font-medium text-[#1e2939]">
                                {record.archivedBy}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Archive date</dt>
                            <dd className="font-medium text-[#1e2939]">
                                {formatArchivedRecordDate(record.archiveDate)}
                            </dd>
                        </div>
                    </dl>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isRestoring}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isRestoring}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#008236] px-4 text-sm font-semibold text-white transition hover:bg-[#016630] disabled:cursor-wait disabled:opacity-70"
                    >
                        {isRestoring && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isRestoring ? 'Restoring...' : 'Restore Record'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
