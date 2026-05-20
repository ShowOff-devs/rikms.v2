import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    Agency,
    AgencyAdminUser,
    AgencyAdminUserStatus,
    UpdateAgencyAdminUserPayload,
} from '@/types/admin-users';

type EditAgencyAdminModalProps = {
    user: AgencyAdminUser | null;
    agencies: Agency[];
    isSaving: boolean;
    isEmailTaken: (email: string, currentUserId?: string) => boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (id: string, payload: UpdateAgencyAdminUserPayload) => void;
};

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function EditAgencyAdminModal({
    user,
    agencies,
    isSaving,
    isEmailTaken,
    onOpenChange,
    onSubmit,
}: EditAgencyAdminModalProps) {
    return (
        <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Edit User
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Update profile, assigned agency, and account status.
                    </DialogDescription>
                </DialogHeader>

                {user && (
                    <EditAgencyAdminForm
                        key={user.id}
                        user={user}
                        agencies={agencies}
                        isSaving={isSaving}
                        isEmailTaken={isEmailTaken}
                        onOpenChange={onOpenChange}
                        onSubmit={onSubmit}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function EditAgencyAdminForm({
    user,
    agencies,
    isSaving,
    isEmailTaken,
    onOpenChange,
    onSubmit,
}: { user: AgencyAdminUser } &
    Omit<EditAgencyAdminModalProps, 'user'>) {
    const [fullName, setFullName] = useState(user.fullName);
    const [email, setEmail] = useState(user.email);
    const [agencyId, setAgencyId] = useState(user.agencyId);
    const [status, setStatus] = useState<AgencyAdminUserStatus>(user.status);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!fullName.trim()) {
            setError('Full Name is required.');

            return;
        }

        if (!validateEmail(email.trim())) {
            setError('Enter a valid Email Address.');

            return;
        }

        if (isEmailTaken(email.trim(), user.id)) {
            setError('Email Address must be unique.');

            return;
        }

        if (!agencyId) {
            setError('Assigned Agency is required.');

            return;
        }

        onSubmit(user.id, {
            fullName,
            email,
            agencyId,
            status,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                    {error}
                </div>
            )}

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Full Name</span>
                <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Email Address</span>
                <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Assigned Agency</span>
                    <Select value={agencyId} onValueChange={setAgencyId}>
                        <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {agencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
                                    {agency.shortName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>

                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Status</span>
                    <Select
                        value={status}
                        onValueChange={(value) =>
                            setStatus(value as AgencyAdminUserStatus)
                        }
                    >
                        <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </label>
            </div>

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Role</span>
                <input
                    value="Agency Admin"
                    disabled
                    className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#6a7282]"
                />
            </label>

            <DialogFooter>
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="h-10 rounded-[8px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3478] disabled:cursor-wait disabled:opacity-70"
                >
                    {isSaving && (
                        <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    Save Changes
                </button>
            </DialogFooter>
        </form>
    );
}
