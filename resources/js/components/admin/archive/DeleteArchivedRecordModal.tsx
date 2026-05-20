import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
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

type DeleteArchivedRecordModalProps = {
    record: AdminArchivedRecord | null;
    open: boolean;
    isDeleting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteArchivedRecordModal({
    record,
    open,
    isDeleting,
    onOpenChange,
    onConfirm,
}: DeleteArchivedRecordModalProps) {
    const [confirmation, setConfirmation] = useState('');

    if (!record) {
        return null;
    }

    const isConfirmed = confirmation === 'DELETE';
    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            setConfirmation('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <Trash2 className="size-5 text-[#dc2626]" />
                        Permanently Delete Record?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This action cannot be undone. The archived record will
                        be permanently removed from the system.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-4">
                    <p className="text-sm font-semibold text-[#991b1b]">
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

                <div>
                    <label
                        htmlFor="delete-archive-confirmation"
                        className="text-sm font-semibold text-[#1e2939]"
                    >
                        Type DELETE to confirm
                    </label>
                    <input
                        id="delete-archive-confirmation"
                        value={confirmation}
                        onChange={(event) =>
                            setConfirmation(event.target.value)
                        }
                        disabled={isDeleting}
                        className="mt-2 h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#dc2626]/50 focus:ring-2 focus:ring-[#dc2626]/10 disabled:opacity-60"
                    />
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={isDeleting}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting || !isConfirmed}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
