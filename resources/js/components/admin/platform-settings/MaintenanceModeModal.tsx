import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type MaintenanceModeModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function MaintenanceModeModal({
    open,
    onOpenChange,
    onConfirm,
}: MaintenanceModeModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-[#0f172a]">
                        Enable Maintenance Mode?
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-[#4a5565]">
                        This may limit access to the RIKMS platform while
                        maintenance mode is active.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="h-10 rounded-[14px] bg-[#fe9a00] px-4 text-sm font-semibold text-white transition hover:bg-[#ea8a00]"
                    >
                        Enable Maintenance Mode
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
