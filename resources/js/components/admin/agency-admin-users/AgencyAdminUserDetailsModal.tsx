import { Clock3, Mail, ShieldCheck } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AgencyAdminUser } from '@/types/admin-users';

type AgencyAdminUserDetailsModalProps = {
    user: AgencyAdminUser | null;
    onOpenChange: (open: boolean) => void;
};

function formatDateTime(value?: string) {
    if (!value) {
        return 'Not yet logged in';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function AgencyAdminUserDetailsModal({
    user,
    onOpenChange,
}: AgencyAdminUserDetailsModalProps) {
    return (
        <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Agency Admin Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        View assigned agency and account governance details.
                    </DialogDescription>
                </DialogHeader>

                {user && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 rounded-[10px] bg-[#f9fafb] p-4">
                            <span className="flex size-12 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-bold text-white">
                                {user.avatarInitials}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-base font-semibold text-[#1e2939]">
                                    {user.fullName}
                                </span>
                                <span className="mt-1 flex items-center gap-1.5 text-sm text-[#99a1af]">
                                    <Mail className="size-4" />
                                    {user.email}
                                </span>
                            </span>
                        </div>

                        <dl className="grid gap-3 text-sm">
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Agency</dt>
                                <dd className="text-right font-semibold text-[#1e3a8a]">
                                    {user.agencyShortName}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Agency Name</dt>
                                <dd className="max-w-[260px] text-right font-medium text-[#1e2939]">
                                    {user.agencyName}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Role</dt>
                                <dd className="inline-flex items-center gap-1.5 font-medium text-[#1e2939]">
                                    <ShieldCheck className="size-4" />
                                    {user.role}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Status</dt>
                                <dd className="font-medium text-[#1e2939] capitalize">
                                    {user.status}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6a7282]">Last Login</dt>
                                <dd className="inline-flex items-center gap-1.5 text-right font-medium text-[#1e2939]">
                                    <Clock3 className="size-4" />
                                    {formatDateTime(user.lastLogin)}
                                </dd>
                            </div>
                        </dl>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
