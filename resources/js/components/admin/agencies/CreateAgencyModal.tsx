import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { agencyTypeOptions } from '@/components/admin/agencies/agency-display';
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
    AgencyAdminOption,
    AgencyStatus,
    AgencyType,
    CreateAgencyPayload,
} from '@/types/admin-agencies';

type CreateAgencyModalProps = {
    open: boolean;
    adminOptions: AgencyAdminOption[];
    isSaving: boolean;
    isNameTaken: (name: string) => boolean;
    isShortNameTaken: (shortName: string) => boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateAgencyPayload) => void;
};

type AgencyFormState = {
    name: string;
    shortName: string;
    type: AgencyType | '';
    description: string;
    website: string;
    contactEmail: string;
    officeAddress: string;
    agencyAdminId: string;
    status: AgencyStatus;
};

const initialForm: AgencyFormState = {
    name: '',
    shortName: '',
    type: '',
    description: '',
    website: '',
    contactEmail: '',
    officeAddress: '',
    agencyAdminId: 'none',
    status: 'active',
};

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUrl(url: string) {
    try {
        const parsedUrl = new URL(url);

        return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
        return false;
    }
}

export function CreateAgencyModal({
    open,
    adminOptions,
    isSaving,
    isNameTaken,
    isShortNameTaken,
    onOpenChange,
    onSubmit,
}: CreateAgencyModalProps) {
    const [form, setForm] = useState<AgencyFormState>(initialForm);
    const [error, setError] = useState<string | null>(null);
    const availableAdminOptions = adminOptions.filter(
        (admin) => admin.status === 'active' && !admin.assignedAgencyId,
    );

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setForm(initialForm);
            setError(null);
        }

        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!form.name.trim()) {
            setError('Agency Name is required.');

            return;
        }

        if (isNameTaken(form.name.trim())) {
            setError('Agency Name must be unique.');

            return;
        }

        if (!form.shortName.trim()) {
            setError('Short Name is required.');

            return;
        }

        if (isShortNameTaken(form.shortName.trim())) {
            setError('Short Name must be unique.');

            return;
        }

        if (!form.type) {
            setError('Agency Type is required.');

            return;
        }

        if (
            form.contactEmail.trim() &&
            !validateEmail(form.contactEmail.trim())
        ) {
            setError('Enter a valid Contact Email.');

            return;
        }

        if (form.website.trim() && !validateUrl(form.website.trim())) {
            setError('Enter a valid Agency Website URL.');

            return;
        }

        onSubmit({
            name: form.name,
            shortName: form.shortName,
            type: form.type,
            description: form.description,
            website: form.website,
            contactEmail: form.contactEmail,
            officeAddress: form.officeAddress,
            agencyAdminId:
                form.agencyAdminId === 'none' ? undefined : form.agencyAdminId,
            status: form.status,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[680px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Create New Agency
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Add a participating agency for governance, research
                        ownership, and future backend integration.
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
                            <span>Agency Name</span>
                            <input
                                value={form.name}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="Full agency name"
                            />
                        </label>

                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Short Name</span>
                            <input
                                value={form.shortName}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        shortName: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="DOST XI"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Agency Type</span>
                            <Select
                                value={form.type}
                                onValueChange={(value) =>
                                    setForm((current) => ({
                                        ...current,
                                        type: value as AgencyType,
                                    }))
                                }
                            >
                                <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencyTypeOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
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
                                        status: value as AgencyStatus,
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

                    <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                        <span>Agency Description</span>
                        <textarea
                            value={form.description}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    description: event.target.value,
                                }))
                            }
                            className="min-h-[82px] w-full resize-none rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Brief governance or research ownership context"
                        />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Agency Website</span>
                            <input
                                value={form.website}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        website: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="https://agency.gov.ph"
                            />
                        </label>

                        <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                            <span>Contact Email</span>
                            <input
                                value={form.contactEmail}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        contactEmail: event.target.value,
                                    }))
                                }
                                className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="contact@agency.gov.ph"
                            />
                        </label>
                    </div>

                    <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                        <span>Office Address</span>
                        <input
                            value={form.officeAddress}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    officeAddress: event.target.value,
                                }))
                            }
                            className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                            placeholder="Office address"
                        />
                    </label>

                    <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                        <span>Assigned Agency Admin</span>
                        <Select
                            value={form.agencyAdminId}
                            onValueChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    agencyAdminId: value,
                                }))
                            }
                        >
                            <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    Unassigned at creation
                                </SelectItem>
                                {availableAdminOptions.map((admin) => (
                                    <SelectItem key={admin.id} value={admin.id}>
                                        {admin.fullName} - {admin.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                            Create Agency
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
