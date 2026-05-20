import { Plus } from 'lucide-react';

type AgencyManagementHeaderProps = {
    onCreate: () => void;
};

export function AgencyManagementHeader({
    onCreate,
}: AgencyManagementHeaderProps) {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
                <h1 className="text-[24px] leading-8 font-bold tracking-normal text-[#111827]">
                    Agency Management
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                    Manage participating agencies contributing research to the
                    RIKMS platform.
                </p>
            </div>

            <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-[#1d3478] focus:ring-2 focus:ring-[#1e3a8a]/20 focus:outline-none"
            >
                <Plus className="size-4" aria-hidden="true" />
                Create New Agency
            </button>
        </section>
    );
}
