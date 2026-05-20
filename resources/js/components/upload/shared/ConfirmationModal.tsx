import { Check, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ConfirmationModalProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isSubmitting?: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    children?: ReactNode;
};

export default function ConfirmationModal({
    open,
    title,
    description,
    confirmLabel,
    isSubmitting = false,
    onOpenChange,
    onConfirm,
    children,
}: ConfirmationModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[18px] border-[#e5e7eb] bg-white">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[#eff6ff] text-[#1e3a8a] sm:mx-0">
                        <ListChecks className="size-6" />
                    </div>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-[14px]"
                        disabled={isSubmitting}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="rounded-[14px] bg-[#00a63e] text-white hover:bg-[#008236]"
                        disabled={isSubmitting}
                        onClick={onConfirm}
                    >
                        <Check className="size-4" />
                        {isSubmitting ? 'Submitting...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
