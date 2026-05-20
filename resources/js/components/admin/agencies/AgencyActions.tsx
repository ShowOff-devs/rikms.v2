import { router } from '@inertiajs/react';
import {
    Archive,
    Edit3,
    Eye,
    FileText,
    MoreVertical,
    UserCog,
    UserCheck,
    UserX,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ManagedAgency } from '@/types/admin-agencies';

type AgencyActionsProps = {
    agency: ManagedAgency;
    onView: (agency: ManagedAgency) => void;
    onEdit: (agency: ManagedAgency) => void;
    onToggleStatus: (agency: ManagedAgency) => void;
    onAssignAdmin: (agency: ManagedAgency) => void;
    onArchive: (agency: ManagedAgency) => void;
};

export function AgencyActions({
    agency,
    onView,
    onEdit,
    onToggleStatus,
    onAssignAdmin,
    onArchive,
}: AgencyActionsProps) {
    const isActive = agency.status === 'active';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                    aria-label={`Open actions for ${agency.name}`}
                >
                    <MoreVertical className="size-4" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => onView(agency)}>
                    <Eye className="size-4" aria-hidden="true" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(agency)}>
                    <Edit3 className="size-4" aria-hidden="true" />
                    Edit Agency
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onToggleStatus(agency)}>
                    {isActive ? (
                        <UserX className="size-4" aria-hidden="true" />
                    ) : (
                        <UserCheck className="size-4" aria-hidden="true" />
                    )}
                    {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAssignAdmin(agency)}>
                    <UserCog className="size-4" aria-hidden="true" />
                    Assign / Change Agency Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() =>
                        router.visit(
                            `/admin/system-research?agency=${agency.id}`,
                        )
                    }
                >
                    <FileText className="size-4" aria-hidden="true" />
                    View Research Records
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onArchive(agency)}
                >
                    <Archive className="size-4" aria-hidden="true" />
                    Archive Agency
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
