import { Building2, ExternalLink, Mail, MapPin, UserRound } from 'lucide-react';
import {
    agencyTypeLabels,
    formatAgencyDate,
} from '@/components/admin/agencies/agency-display';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ManagedAgency } from '@/types/admin-agencies';

type AgencyDetailsModalProps = {
    agency: ManagedAgency | null;
    onOpenChange: (open: boolean) => void;
};

export function AgencyDetailsModal({
    agency,
    onOpenChange,
}: AgencyDetailsModalProps) {
    return (
        <Dialog open={Boolean(agency)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[580px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        Agency Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        View participating agency governance details.
                    </DialogDescription>
                </DialogHeader>

                {agency && (
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 rounded-[10px] bg-[#f9fafb] p-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a]">
                                <Building2 className="size-6" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-base font-semibold text-[#1e2939]">
                                    {agency.name}
                                </span>
                                <span className="mt-1 inline-flex rounded-[4px] bg-[#1e3a8a]/5 px-2 py-0.5 text-xs font-semibold text-[#1e3a8a]">
                                    {agency.shortName}
                                </span>
                                <span className="mt-2 block text-sm text-[#6a7282]">
                                    {agency.description ||
                                        'No agency description has been provided.'}
                                </span>
                            </span>
                        </div>

                        <dl className="grid gap-3 text-sm">
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Agency Type</dt>
                                <dd className="text-right font-medium text-[#1e2939]">
                                    {agencyTypeLabels[agency.type]}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Status</dt>
                                <dd className="font-medium text-[#1e2939] capitalize">
                                    {agency.status}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">
                                    Research Records
                                </dt>
                                <dd className="font-semibold text-[#1e2939]">
                                    {agency.totalResearch.toLocaleString()}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Last Updated</dt>
                                <dd className="font-medium text-[#1e2939]">
                                    {formatAgencyDate(agency.lastUpdated)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Agency Admin</dt>
                                <dd className="max-w-[300px] text-right font-medium text-[#1e2939]">
                                    {agency.agencyAdmin ? (
                                        <span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <UserRound className="size-4" />
                                                {agency.agencyAdmin.fullName}
                                            </span>
                                            <span className="block text-xs font-normal text-[#99a1af]">
                                                {agency.agencyAdmin.email}
                                            </span>
                                        </span>
                                    ) : (
                                        'Unassigned'
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">
                                    Contact Email
                                </dt>
                                <dd className="inline-flex items-center gap-1.5 text-right font-medium text-[#1e2939]">
                                    <Mail className="size-4" />
                                    {agency.contactEmail || 'Not provided'}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[#f3f4f6] pb-3">
                                <dt className="text-[#6a7282]">Website</dt>
                                <dd className="inline-flex max-w-[300px] items-center gap-1.5 truncate text-right font-medium text-[#1e3a8a]">
                                    <ExternalLink className="size-4 shrink-0" />
                                    {agency.website || 'Not provided'}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6a7282]">
                                    Office Address
                                </dt>
                                <dd className="inline-flex max-w-[300px] items-center gap-1.5 text-right font-medium text-[#1e2939]">
                                    <MapPin className="size-4 shrink-0" />
                                    {agency.officeAddress || 'Not provided'}
                                </dd>
                            </div>
                        </dl>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
