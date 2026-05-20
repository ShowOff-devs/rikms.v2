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
import type { AgencyAdminOption, ManagedAgency } from '@/types/admin-agencies';

type AssignAgencyAdminModalProps = {
    agency: ManagedAgency | null;
    adminOptions: AgencyAdminOption[];
    isSaving: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (agencyId: string, adminUserId: string) => void;
};

export function AssignAgencyAdminModal({
    agency,
    adminOptions,
    isSaving,
    onOpenChange,
    onSubmit,
}: AssignAgencyAdminModalProps) {
    return (
        <Dialog open={Boolean(agency)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Assign Agency Admin
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Select an active Agency Admin user to manage this
                        agency.
                    </DialogDescription>
                </DialogHeader>

                {agency && (
                    <AssignAgencyAdminForm
                        key={agency.id}
                        agency={agency}
                        adminOptions={adminOptions}
                        isSaving={isSaving}
                        onOpenChange={onOpenChange}
                        onSubmit={onSubmit}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function AssignAgencyAdminForm({
    agency,
    adminOptions,
    isSaving,
    onOpenChange,
    onSubmit,
}: { agency: ManagedAgency } & Omit<AssignAgencyAdminModalProps, 'agency'>) {
    const [adminUserId, setAdminUserId] = useState(
        agency.agencyAdmin?.id ?? '',
    );
    const [error, setError] = useState<string | null>(null);
    const availableAdmins = adminOptions.filter(
        (admin) =>
            admin.status === 'active' &&
            (!admin.assignedAgencyId ||
                admin.assignedAgencyId === agency.id ||
                admin.id === agency.agencyAdmin?.id),
    );

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const selectedAdmin = availableAdmins.find(
            (admin) => admin.id === adminUserId,
        );

        if (!selectedAdmin) {
            setError('Select an available Agency Admin user.');

            return;
        }

        onSubmit(agency.id, adminUserId);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                    {error}
                </div>
            )}

            <p className="rounded-[8px] bg-[#f9fafb] px-3 py-2 text-sm text-[#4a5565]">
                {agency.name} - {agency.shortName}
            </p>

            <label className="space-y-1.5 text-sm font-medium text-[#1e2939]">
                <span>Agency Admin User</span>
                <Select value={adminUserId} onValueChange={setAdminUserId}>
                    <SelectTrigger className="h-10 w-full rounded-[8px] border-[#e5e7eb] shadow-none">
                        <SelectValue placeholder="Select agency admin" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableAdmins.map((admin) => (
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
                    Save Assignment
                </button>
            </DialogFooter>
        </form>
    );
}
