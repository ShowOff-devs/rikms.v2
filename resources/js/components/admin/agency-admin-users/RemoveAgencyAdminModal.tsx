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

type RemoveAgencyAdminModalProps = {
    user: AgencyAdminUser | null;
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function RemoveAgencyAdminModal({
    user,
    isSaving,
    onOpenChange,
    onConfirm,
}: RemoveAgencyAdminModalProps) {
    return (
        <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Remove User?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This removes agency admin access and archives the
                        account from active administration. Confirm before
                        continuing.
                    </DialogDescription>
                </DialogHeader>

                {user && (
                    <p className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
                        {user.fullName} - {user.agencyShortName}
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
                        Remove User
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
