import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
                    This dashboard provides a concise moderation summary. Open
                    the moderation queue to review actions, notes, and audit
                    history for the selected record.
                </div>
                <DialogFooter>
                    <Link
                        href="/admin/moderation"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#172554] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        Open Moderation Queue
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
