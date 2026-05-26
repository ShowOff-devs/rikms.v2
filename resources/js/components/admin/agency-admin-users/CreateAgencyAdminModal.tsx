import { Loader2, Send } from 'lucide-react';
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
    AgencyAdminUserStatus,
    CreateAgencyAdminUserPayload,
} from '@/types/admin-users';

type CreateAgencyAdminModalProps = {
    open: boolean;
    agencies: Agency[];
    isSaving: boolean;
    isEmailTaken: (email: string) => boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateAgencyAdminUserPayload) => void;
};

type CreateFormState = {
    fullName: string;
    email: string;
    agencyId: string;
    temporaryPassword: string;
    status: AgencyAdminUserStatus;
    sendInvite: boolean;
};

const initialForm: CreateFormState = {
    fullName: '',
    email: '',
    agencyId: '',
    temporaryPassword: '',
    status: 'active',
    sendInvite: true,
};

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CreateAgencyAdminModal({
    open,
    agencies,
    isSaving,
    isEmailTaken,
    onOpenChange,
    onSubmit,
}: CreateAgencyAdminModalProps) {
    const [form, setForm] = useState<CreateFormState>(initialForm);
    const [error, setError] = useState<string | null>(null);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setForm(initialForm);
            setError(null);
        }

        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!form.fullName.trim()) {
            setError('Full Name is required.');

            return;
        }

        if (!validateEmail(form.email.trim())) {
            setError('Enter a valid Email Address.');

            return;
        }

        if (isEmailTaken(form.email.trim())) {
            setError('Email Address must be unique.');

            return;
        }

        if (!form.agencyId) {
            setError('Assigned Agency is required.');

            return;
        }

        onSubmit({
            fullName: form.fullName,
            email: form.email,
            agencyId: form.agencyId,
            role: 'Agency Admin',
            status: form.status,
            sendInvite: form.sendInvite,
            temporaryPassword: form.temporaryPassword,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Create Agency Admin
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Add an administrator account and assign it to one
                        participating agency.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Full Name</span>
                            <input
                                value={form.fullName}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        fullName: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="Full name"
                            />
                        </label>

                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Email Address</span>
                            <input
                                value={form.email}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="name@agency.gov.ph"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Assigned Agency</span>
                            <Select
                                value={form.agencyId}
                                onValueChange={(value) =>
                                    setForm((current) => ({
                                        ...current,
                                        agencyId: value,
                                    }))
                                }
                            >
                                <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                                    <SelectValue placeholder="Select agency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.map((agency) => (
                                        <SelectItem
                                            key={agency.id}
                                            value={agency.id}
                                        >
                                            {agency.shortName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>

                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Status</span>
                            <Select
                                value={form.status}
                                onValueChange={(value) =>
                                    setForm((current) => ({
                                        ...current,
                                        status: value as AgencyAdminUserStatus,
                                    }))
                                }
                            >
                                <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Role</span>
                            <input
                                value="Agency Admin"
                                disabled
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm text-[#6a7282]"
                            />
                        </label>

                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Temporary Password</span>
                            <input
                                value={form.temporaryPassword}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        temporaryPassword: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="Optional"
                                type="password"
                            />
                        </label>
                    </div>

                    <label className="flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#4a5565]">
                        <input
                            type="checkbox"
                            checked={form.sendInvite}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    sendInvite: event.target.checked,
                                }))
                            }
                            className="size-4 rounded border-[#d1d5db]"
                        />
                        <Send className="size-4 text-[#1e3a8a]" />
                        Send invitation email
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
                            Create User
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
