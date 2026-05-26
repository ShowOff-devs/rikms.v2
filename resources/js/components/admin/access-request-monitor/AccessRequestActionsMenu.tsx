import { ClipboardCheck, Eye, MoreVertical, ShieldX } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AccessRequestMonitorRecord } from '@/types/access-request-monitor';

type AccessRequestActionsMenuProps = {
    record: AccessRequestMonitorRecord;
    onView: (record: AccessRequestMonitorRecord) => void;
    onAudit: (record: AccessRequestMonitorRecord) => void;
    onOverrideDeny: (record: AccessRequestMonitorRecord) => void;
};

export function AccessRequestActionsMenu({
    record,
    onView,
    onAudit,
    onOverrideDeny,
}: AccessRequestActionsMenuProps) {
    return (
        <div className="flex justify-end gap-1">
            <button
                type="button"
                onClick={() => onView(record)}
                className="flex size-8 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
                aria-label={`View ${record.researchTitle}`}
                title="View Request Details"
            >
                <Eye className="size-4" aria-hidden="true" />
            </button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                        aria-label={`Open actions for ${record.researchTitle}`}
                        title="More options"
                    >
                        <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-[10px] border-[#e5e7eb] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
                >
                    <DropdownMenuItem onSelect={() => onView(record)}>
                        <Eye className="size-4" aria-hidden="true" />
                        View Request Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onAudit(record)}>
                        <ClipboardCheck className="size-4" aria-hidden="true" />
                        Audit Decision
                    </DropdownMenuItem>
                    {record.status === 'approved' ? (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => onOverrideDeny(record)}
                            >
                                <ShieldX
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Override - Deny
                            </DropdownMenuItem>
                        </>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
