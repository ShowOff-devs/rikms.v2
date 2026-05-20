import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ModerationItem } from '@/types/admin-dashboard';

type AdminDashboardDialogProps = {
    item: ModerationItem | null;
    onOpenChange: (open: boolean) => void;
};

export function AdminDashboardDialog({
    item,
    onOpenChange,
}: AdminDashboardDialogProps) {
    return (
        <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px]">
                <DialogHeader>
                    <DialogTitle className="text-[#0f172a]">
                        {item?.title ?? 'Moderation Details'}
                    </DialogTitle>
                    <DialogDescription>
                        {item
                            ? `${item.agency} • ${item.statusLabel}`
                            : 'Review moderation issue details.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm leading-6 text-[#475569]">
                    This placeholder detail view is ready for the Laravel
                    moderation API. It can later show duplicate matches,
                    metadata completeness, reviewer notes, and audit history.
                </div>
            </DialogContent>
        </Dialog>
    );
}
