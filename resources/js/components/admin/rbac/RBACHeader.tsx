import { Plus } from 'lucide-react';

type RBACHeaderProps = {
    onCreateRole: () => void;
};

export function RBACHeader({ onCreateRole }: RBACHeaderProps) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-[24px] leading-9 font-bold tracking-normal text-[#101828]">
                    RBAC Management
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                    Define system roles, assign permissions, and manage access
                    control across the RIKMS platform.
                </p>
            </div>

            <button
                type="button"
                onClick={onCreateRole}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d3478]"
            >
                <Plus className="size-4" aria-hidden="true" />
                Create New Role
            </button>
        </header>
    );
}
