import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type DeactivateAccountModalProps = {
    open: boolean;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeactivateAccountModal({
    open,
    isSubmitting,
    onOpenChange,
    onConfirm,
}: DeactivateAccountModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb]">
                <DialogHeader>
                    <DialogTitle className="text-[#e7000b]">
                        Request Account Deactivation?
                    </DialogTitle>
                    <DialogDescription className="leading-6">
                        This will submit a deactivation request to the Super
                        Admin. Your account will not be deactivated until the
                        request is reviewed and approved.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="h-9 rounded-[8px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="h-9 rounded-[8px] bg-[#e7000b] px-4 text-sm font-medium text-white hover:bg-[#c10007] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
