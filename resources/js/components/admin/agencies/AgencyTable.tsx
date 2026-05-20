import { Building2, FileText } from 'lucide-react';
import {
    agencyTypeLabels,
    formatAgencyDate,
} from '@/components/admin/agencies/agency-display';
import { AgencyActions } from '@/components/admin/agencies/AgencyActions';
import type { ManagedAgency } from '@/types/admin-agencies';

type AgencyTableProps = {
    agencies: ManagedAgency[];
    isLoading: boolean;
    onView: (agency: ManagedAgency) => void;
    onEdit: (agency: ManagedAgency) => void;
    onToggleStatus: (agency: ManagedAgency) => void;
    onAssignAdmin: (agency: ManagedAgency) => void;
    onArchive: (agency: ManagedAgency) => void;
};

export function AgencyTable({
    agencies,
    isLoading,
    onView,
    onEdit,
    onToggleStatus,
    onAssignAdmin,
    onArchive,
}: AgencyTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 px-5 py-5">
                {Array.from({ length: 7 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[64px] animate-pulse rounded-[8px] bg-[#f3f4f6]"
                    />
                ))}
            </div>
        );
    }

    if (agencies.length === 0) {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-[#dbeafe] text-[#1e3a8a]">
                    <Building2 className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-[#1e2939]">
                    No agencies found
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-5 text-[#6a7282]">
                    Adjust the search or filters to find the participating
                    agency you need.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
                <thead>
                    <tr className="h-[45px] border-b border-[#f3f4f6] bg-[#f9fafb] text-left">
                        <th className="w-[29%] px-5 text-[11px] font-semibold text-[#6a7282]">
                            Agency
                        </th>
                        <th className="w-[10%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Short Name
                        </th>
                        <th className="w-[18%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Agency Admin
                        </th>
                        <th className="w-[10%] px-4 text-center text-[11px] leading-3 font-semibold text-[#6a7282]">
                            Total
                            <br />
                            Research
                        </th>
                        <th className="w-[9%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Status
                        </th>
                        <th className="w-[12%] px-4 text-center text-[11px] leading-3 font-semibold text-[#6a7282]">
                            Last
                            <br />
                            Updated
                        </th>
                        <th className="w-[7%] px-5 text-right text-[11px] font-semibold text-[#6a7282]">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {agencies.map((agency) => {
                        const isActive = agency.status === 'active';

                        return (
                            <tr
                                key={agency.id}
                                className="h-[81px] border-b border-[#f9fafb] transition hover:bg-[#f8fafc]"
                            >
                                <td className="px-5">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a]">
                                            <Building2
                                                className="size-[18px]"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm leading-5 font-semibold text-[#1e2939]">
                                                {agency.name}
                                            </span>
                                            <span className="block truncate text-xs leading-4 text-[#99a1af]">
                                                {agencyTypeLabels[agency.type]}
                                            </span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4">
                                    <span className="inline-flex items-center rounded-[4px] bg-[#1e3a8a]/5 px-2 py-0.5 text-sm leading-5 font-semibold text-[#1e3a8a]">
                                        {agency.shortName}
                                    </span>
                                </td>
                                <td className="px-4">
                                    {agency.agencyAdmin ? (
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm leading-5 font-medium text-[#364153]">
                                                {agency.agencyAdmin.fullName}
                                            </span>
                                            <span className="block truncate text-xs leading-4 text-[#99a1af]">
                                                {agency.agencyAdmin.email}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-xs leading-4 text-[#99a1af]">
                                            Unassigned
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 text-sm leading-5 text-[#364153]">
                                        <FileText
                                            className="size-3.5 text-[#99a1af]"
                                            aria-hidden="true"
                                        />
                                        {agency.totalResearch.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-4">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-4 font-semibold ${
                                            isActive
                                                ? 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]'
                                                : 'border-[#e5e7eb] bg-[#f9fafb] text-[#4a5565]'
                                        }`}
                                    >
                                        <span
                                            className={`size-1.5 rounded-full ${
                                                isActive
                                                    ? 'bg-[#00c950]'
                                                    : 'bg-[#99a1af]'
                                            }`}
                                        />
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 text-center">
                                    <span className="text-xs leading-4 text-[#99a1af]">
                                        {formatAgencyDate(agency.lastUpdated)}
                                    </span>
                                </td>
                                <td className="px-5">
                                    <div className="flex justify-end">
                                        <AgencyActions
                                            agency={agency}
                                            onView={onView}
                                            onEdit={onEdit}
                                            onToggleStatus={onToggleStatus}
                                            onAssignAdmin={onAssignAdmin}
                                            onArchive={onArchive}
                                        />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
