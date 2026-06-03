import { Eye } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { archiveStatusLabels } from '@/data/admin-archive-options';
import type { AdminArchivedRecord } from '@/types/admin-archive';
import {
    getArchivedRecordDetails,
    getArchivedRecordTitle,
} from './archive-record-display';

type ViewArchivedRecordModalProps = {
    record: AdminArchivedRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function ViewArchivedRecordModal({
    record,
    open,
    onOpenChange,
}: ViewArchivedRecordModalProps) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <Eye className="size-5 text-[#1e3a8a]" />
                        Archived Record Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        View-only archive details for{' '}
                        {getArchivedRecordTitle(record)}.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <dl className="grid gap-3 sm:grid-cols-2">
                        {getArchivedRecordDetails(record).map(
                            ([label, value]) => (
                                <div key={label}>
                                    <dt className="text-[11px] font-semibold tracking-normal text-[#99a1af] uppercase">
                                        {label}
                                    </dt>
                                    <dd className="mt-1 text-sm font-medium break-words text-[#1e2939]">
                                        {label === 'Status'
                                            ? archiveStatusLabels[
                                                  value as keyof typeof archiveStatusLabels
                                              ]
                                            : value}
                                    </dd>
                                </div>
                            ),
                        )}
                    </dl>
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
