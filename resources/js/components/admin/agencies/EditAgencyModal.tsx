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
    ManagedAgency,
    UpdateAgencyPayload,
} from '@/types/admin-agencies';

type EditAgencyModalProps = {
    agency: ManagedAgency | null;
    adminOptions: AgencyAdminOption[];
    isSaving: boolean;
    isNameTaken: (name: string, currentAgencyId?: string) => boolean;
    isShortNameTaken: (shortName: string, currentAgencyId?: string) => boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (id: string, payload: UpdateAgencyPayload) => void;
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

export function EditAgencyModal({
    agency,
    adminOptions,
    isSaving,
    isNameTaken,
    isShortNameTaken,
    onOpenChange,
    onSubmit,
}: EditAgencyModalProps) {
    return (
        <Dialog open={Boolean(agency)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[680px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Edit Agency
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Update agency profile, assigned admin, and platform
                        status.
                    </DialogDescription>
                </DialogHeader>

                {agency && (
                    <EditAgencyForm
                        key={agency.id}
                        agency={agency}
                        adminOptions={adminOptions}
                        isSaving={isSaving}
                        isNameTaken={isNameTaken}
                        isShortNameTaken={isShortNameTaken}
                        onOpenChange={onOpenChange}
                        onSubmit={onSubmit}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function EditAgencyForm({
    agency,
    adminOptions,
    isSaving,
    isNameTaken,
    isShortNameTaken,
    onOpenChange,
    onSubmit,
}: { agency: ManagedAgency } & Omit<EditAgencyModalProps, 'agency'>) {
    const [name, setName] = useState(agency.name);
    const [shortName, setShortName] = useState(agency.shortName);
    const [type, setType] = useState<AgencyType>(agency.type);
    const [description, setDescription] = useState(agency.description ?? '');
    const [website, setWebsite] = useState(agency.website ?? '');
    const [contactEmail, setContactEmail] = useState(agency.contactEmail ?? '');
    const [officeAddress, setOfficeAddress] = useState(
        agency.officeAddress ?? '',
    );
    const [agencyAdminId, setAgencyAdminId] = useState(
        agency.agencyAdmin?.id ?? 'none',
    );
    const [status, setStatus] = useState<AgencyStatus>(agency.status);
    const [error, setError] = useState<string | null>(null);
    const availableAdminOptions = adminOptions.filter(
        (admin) =>
            admin.status === 'active' &&
            (!admin.assignedAgencyId ||
                admin.assignedAgencyId === agency.id ||
                admin.id === agency.agencyAdmin?.id),
    );

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name.trim()) {
            setError('Agency Name is required.');

            return;
        }

        if (isNameTaken(name.trim(), agency.id)) {
            setError('Agency Name must be unique.');

            return;
        }

        if (!shortName.trim()) {
            setError('Short Name is required.');

            return;
        }

        if (isShortNameTaken(shortName.trim(), agency.id)) {
            setError('Short Name must be unique.');

            return;
        }

        if (contactEmail.trim() && !validateEmail(contactEmail.trim())) {
            setError('Enter a valid Contact Email.');

            return;
        }

        if (website.trim() && !validateUrl(website.trim())) {
            setError('Enter a valid Agency Website URL.');

            return;
        }

        onSubmit(agency.id, {
            name,
            shortName,
            type,
            description,
            website,
            contactEmail,
            officeAddress,
            agencyAdminId: agencyAdminId === 'none' ? undefined : agencyAdminId,
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

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Agency Name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Short Name</span>
                    <input
                        value={shortName}
                        onChange={(event) => setShortName(event.target.value)}
                        className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Agency Type</span>
                    <Select
                        value={type}
                        onValueChange={(value) => setType(value as AgencyType)}
                    >
                        <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                            <SelectValue />
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
                        value={status}
                        onValueChange={(value) =>
                            setStatus(value as AgencyStatus)
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
                <span>Agency Description</span>
                <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-[82px] w-full resize-none rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Agency Website</span>
                    <input
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                    <span>Contact Email</span>
                    <input
                        value={contactEmail}
                        onChange={(event) =>
                            setContactEmail(event.target.value)
                        }
                        className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                </label>
            </div>

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Office Address</span>
                <input
                    value={officeAddress}
                    onChange={(event) => setOfficeAddress(event.target.value)}
                    className="h-10 w-full rounded-[8px] border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#1e3a8a]/40 focus:ring-2 focus:ring-[#1e3a8a]/10"
                />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Assigned Agency Admin</span>
                <Select value={agencyAdminId} onValueChange={setAgencyAdminId}>
                    <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
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
                    Save Changes
                </button>
            </DialogFooter>
        </form>
    );
}
