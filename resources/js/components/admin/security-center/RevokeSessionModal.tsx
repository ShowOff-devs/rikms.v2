import { Loader2, UserX } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AdminSession } from '@/types/security-center';

type RevokeSessionModalProps = {
    session: AdminSession | null;
    open: boolean;
    isRevoking: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function RevokeSessionModal({
    session,
    open,
    isRevoking,
    onOpenChange,
    onConfirm,
}: RevokeSessionModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#fef2f2] text-[#e7000b]">
                            <UserX className="size-5" aria-hidden="true" />
                        </span>
                        Revoke Admin Session?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This will immediately end the selected admin session.
                        The user may need to sign in again.
                    </DialogDescription>
                </DialogHeader>

                {session && (
                    <div className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                        <p className="text-sm font-semibold text-[#1e2939]">
                            {session.user}
                        </p>
                        <p className="mt-1 text-xs text-[#6a7282]">
                            {session.role} - {session.device} -{' '}
                            {session.ipAddress}
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isRevoking}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isRevoking || !session}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#dc2626] px-4 text-sm font-medium text-white transition hover:bg-[#b91c1c] disabled:opacity-70"
                    >
                        {isRevoking ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <UserX className="size-4" aria-hidden="true" />
                        )}
                        {isRevoking ? 'Revoking...' : 'Revoke Session'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
