import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AgencyAdminUser } from '@/types/admin-users';

type ResetPasswordModalProps = {
    user: AgencyAdminUser | null;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function ResetPasswordModal({
    user,
    isSaving,
    onOpenChange,
    onConfirm,
}: ResetPasswordModalProps) {
    return (
        <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Reset Password?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        A password reset instruction or temporary password will
                        be sent to the user's registered email address.
                    </DialogDescription>
                </DialogHeader>

                {user && (
                    <p className="rounded-[8px] bg-[#f9fafb] px-3 py-2 text-sm text-[#4a5565]">
                        Send reset instructions to {user.email}
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
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3478] disabled:cursor-wait disabled:opacity-70"
                    >
                        {isSaving && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        Send Reset
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

