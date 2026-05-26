import { Clock3, Mail, UserRound } from 'lucide-react';
import { AgencyAdminUserActions } from '@/components/admin/agency-admin-users/AgencyAdminUserActions';
import type { AgencyAdminUser } from '@/types/admin-users';

type AgencyAdminUsersTableProps = {
    users: AgencyAdminUser[];
    isLoading: boolean;
    onView: (user: AgencyAdminUser) => void;
    onEdit: (user: AgencyAdminUser) => void;
    onToggleStatus: (user: AgencyAdminUser) => void;
    onResetPassword: (user: AgencyAdminUser) => void;
    onRemove: (user: AgencyAdminUser) => void;
};

const avatarColors = [
    'bg-[#818cf8]',
    'bg-[#f43f5e]',
    'bg-[#eab308]',
    'bg-[#10b981]',
    'bg-[#06b6d4]',
    'bg-[#8b5cf6]',
    'bg-[#3b82f6]',
    'bg-[#f97316]',
    'bg-[#a855f7]',
    'bg-[#14b8a6]',
];

function formatDateTime(value?: string) {
    if (!value) {
        return 'Not yet logged in';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function AgencyAdminUsersTable({
    users,
    isLoading,
    onView,
    onEdit,
    onToggleStatus,
    onResetPassword,
    onRemove,
}: AgencyAdminUsersTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 px-5 py-5">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[56px] animate-pulse rounded-[8px] bg-[#f3f4f6]"
                    />
                ))}
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-[#dbeafe] text-[#1e3a8a]">
                    <UserRound className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-[#1e2939]">
                    No agency admin users found
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-5 text-[#6a7282]">
                    Adjust the search or filters to find the agency admin
                    account you need.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse">
                <thead>
                    <tr className="h-[45px] border-b border-[#f3f4f6] bg-[#f9fafb] text-left">
                        <th className="w-[34%] px-5 text-[11px] font-semibold text-[#6a7282]">
                            User
                        </th>
                        <th className="w-[14%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Agency
                        </th>
                        <th className="w-[16%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Role
                        </th>
                        <th className="w-[12%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Status
                        </th>
                        <th className="w-[18%] px-4 text-[11px] font-semibold text-[#6a7282]">
                            Last Login
                        </th>
                        <th className="w-[6%] px-5 text-right text-[11px] font-semibold text-[#6a7282]">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => {
                        const isActive = user.status === 'active';

                        return (
                            <tr
                                key={user.id}
                                className="h-[73px] border-b border-[#f9fafb] transition hover:bg-[#f8fafc]"
                            >
                                <td className="px-5">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                                                avatarColors[
                                                    index % avatarColors.length
                                                ]
                                            }`}
                                        >
                                            {user.avatarInitials}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm leading-5 font-semibold text-[#1e2939]">
                                                {user.fullName}
                                            </span>
                                            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-4 text-[#99a1af]">
                                                <Mail
                                                    className="size-3 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span className="truncate">
                                                    {user.email}
                                                </span>
                                            </span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4">
                                    <span className="inline-flex items-center rounded-[8px] bg-[#1e3a8a]/5 px-2 py-1 text-xs leading-4 font-semibold text-[#1e3a8a]">
                                        {user.agencyShortName}
                                    </span>
                                </td>
                                <td className="px-4">
                                    <span className="inline-flex items-center gap-1.5 text-xs leading-4 text-[#4a5565]">
                                        <UserRound
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                        {user.role}
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
                                <td className="px-4">
                                    <span className="inline-flex items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                                        <Clock3
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                        {formatDateTime(user.lastLogin)}
                                    </span>
                                </td>
                                <td className="px-5">
                                    <div className="flex justify-end">
                                        <AgencyAdminUserActions
                                            user={user}
                                            onView={onView}
                                            onEdit={onEdit}
                                            onToggleStatus={onToggleStatus}
                                            onResetPassword={onResetPassword}
                                            onRemove={onRemove}
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
