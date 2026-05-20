import {
    Copy,
    Edit3,
    Eye,
    MoreVertical,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Role } from '@/types/rbac';

type RoleActionsMenuProps = {
    role: Role;
    onView: (role: Role) => void;
    onEdit: (role: Role) => void;
    onDuplicate: (role: Role) => void;
    onDelete: (role: Role) => void;
};

export function RoleActionsMenu({
    role,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
}: RoleActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-[10px] text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#1e3a8a]"
                    aria-label={`Open actions for ${role.name}`}
                >
                    <MoreVertical className="size-4" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => onView(role)}>
                    <Eye className="size-4" aria-hidden="true" />
                    View Role
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(role)}>
                    <Edit3 className="size-4" aria-hidden="true" />
                    Edit Role
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDuplicate(role)}>
                    <Copy className="size-4" aria-hidden="true" />
                    Duplicate Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {role.isSystemRole ? (
                    <DropdownMenuItem disabled>
                        <ShieldAlert className="size-4" aria-hidden="true" />
                        Protected Role
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete(role)}
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete Role
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
