import {
    Edit3,
    Eye,
    KeyRound,
    MoreVertical,
    Trash2,
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
import type { AgencyAdminUser } from '@/types/admin-users';

type AgencyAdminUserActionsProps = {
    user: AgencyAdminUser;
    onView: (user: AgencyAdminUser) => void;
    onEdit: (user: AgencyAdminUser) => void;
    onToggleStatus: (user: AgencyAdminUser) => void;
    onResetPassword: (user: AgencyAdminUser) => void;
    onRemove: (user: AgencyAdminUser) => void;
};

export function AgencyAdminUserActions({
    user,
    onView,
    onEdit,
    onToggleStatus,
    onResetPassword,
    onRemove,
}: AgencyAdminUserActionsProps) {
    const isActive = user.status === 'active';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                    aria-label={`Open actions for ${user.fullName}`}
                >
                    <MoreVertical className="size-4" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onView(user)}>
                    <Eye className="size-4" aria-hidden="true" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(user)}>
                    <Edit3 className="size-4" aria-hidden="true" />
                    Edit User
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onToggleStatus(user)}>
                    {isActive ? (
                        <UserX className="size-4" aria-hidden="true" />
                    ) : (
                        <UserCheck className="size-4" aria-hidden="true" />
                    )}
                    {isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onResetPassword(user)}>
                    <KeyRound className="size-4" aria-hidden="true" />
                    Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onRemove(user)}
                >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remove User
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
