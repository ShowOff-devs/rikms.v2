import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ManagedAgency } from '@/types/admin-agencies';

type ArchiveAgencyModalProps = {
    agency: ManagedAgency | null;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function ArchiveAgencyModal({
    agency,
    isSaving,
    onOpenChange,
    onConfirm,
}: ArchiveAgencyModalProps) {
    return (
        <Dialog open={Boolean(agency)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Archive Agency?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This mock action is confirmation-gated for future
                        backend audit logging. Research records are not deleted.
                    </DialogDescription>
                </DialogHeader>

                {agency && (
                    <p className="rounded-[8px] bg-[#f9fafb] px-3 py-2 text-sm text-[#4a5565]">
                        {agency.name} - {agency.totalResearch.toLocaleString()}{' '}
                        research records
                    </p>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[8px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-wait disabled:opacity-70"
                    >
                        {isSaving && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        Archive
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
