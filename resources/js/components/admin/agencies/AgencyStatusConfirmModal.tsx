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

type AgencyStatusConfirmModalProps = {
    agency: ManagedAgency | null;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function AgencyStatusConfirmModal({
    agency,
    isSaving,
    onOpenChange,
    onConfirm,
}: AgencyStatusConfirmModalProps) {
    const isActive = agency?.status === 'active';
    const actionLabel = isActive ? 'Deactivate' : 'Activate';

    return (
        <Dialog open={Boolean(agency)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        {actionLabel} Agency?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        {isActive
                            ? 'This disables agency access and upload permissions, but existing research records remain visible in the system.'
                            : 'This restores agency access and makes the agency available for active governance workflows.'}
                    </DialogDescription>
                </DialogHeader>

                {agency && (
                    <p className="rounded-[8px] bg-[#f9fafb] px-3 py-2 text-sm text-[#4a5565]">
                        {agency.name} - {agency.shortName}
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
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70 ${
                            isActive
                                ? 'bg-[#dc2626] hover:bg-[#b91c1c]'
                                : 'bg-[#1e3a8a] hover:bg-[#1d3478]'
                        }`}
                    >
                        {isSaving && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {actionLabel}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
