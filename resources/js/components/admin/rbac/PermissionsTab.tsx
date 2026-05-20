import { KeyRound } from 'lucide-react';
import { groupPermissionsByModule } from '@/components/admin/rbac/rbac-display';
import type { Permission } from '@/types/rbac';

type PermissionsTabProps = {
    permissions: Permission[];
};

export function PermissionsTab({ permissions }: PermissionsTabProps) {
    const groups = groupPermissionsByModule(permissions);

    if (permissions.length === 0) {
        return (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-[#fef3c7] text-[#d97706]">
                    <KeyRound className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-[#1e2939]">
                    No permissions found
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-5 text-[#6a7282]">
                    Adjust the search query to inspect available permissions.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 px-6 py-5">
            {groups.map((group) => (
                <section
                    key={group.module}
                    className="rounded-[10px] border border-[#e5e7eb] bg-white"
                >
                    <div className="border-b border-[#f3f4f6] px-4 py-3">
                        <h2 className="text-sm font-bold text-[#1e2939]">
                            {group.label}
                        </h2>
                    </div>
                    <div className="divide-y divide-[#f3f4f6]">
                        {group.permissions.map((permission) => (
                            <article
                                key={permission.id}
                                className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_180px_1.4fr]"
                            >
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1e2939]">
                                        {permission.name}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-[#99a1af]">
                                        {group.label}
                                    </p>
                                </div>
                                <code className="self-start rounded-[4px] bg-[#1e3a8a]/5 px-2 py-1 text-xs font-semibold text-[#1e3a8a]">
                                    {permission.key}
                                </code>
                                <p className="text-sm leading-5 text-[#6a7282]">
                                    {permission.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
