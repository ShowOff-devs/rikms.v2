import { router } from '@inertiajs/react';
import { CheckCircle2, FileText, FolderOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AgencyResearchSummary as AgencyResearchSummaryType } from '@/types/agency-profile';

type AgencyResearchSummaryProps = {
    summary: AgencyResearchSummaryType;
};

export function AgencyResearchSummary({ summary }: AgencyResearchSummaryProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="text-sm leading-5 font-bold text-[#1e3a8a]">
                Research Summary
            </h2>

            <div className="mt-5 space-y-3">
                <SummaryRow
                    icon={FileText}
                    label="Total Research Publications"
                    value={summary.totalResearchPublications}
                    className="bg-[#f4f4fb]"
                    iconClassName="bg-[#dbeafe] text-[#1e3a8a]"
                    valueClassName="text-[#1e3a8a]"
                    labelClassName="text-[#1e3a8a]"
                />
                <SummaryRow
                    icon={CheckCircle2}
                    label="Published Research"
                    value={summary.publishedResearch}
                    className="bg-[#ecfdf3]"
                    iconClassName="bg-[#dcfce7] text-[#008236]"
                    valueClassName="text-[#008236]"
                    labelClassName="text-[#008236]"
                />
                <SummaryRow
                    icon={FolderOpen}
                    label="Draft Research"
                    value={summary.draftResearch}
                    className="bg-[#fffbeb]"
                    iconClassName="bg-[#fef3c7] text-[#bb4d00]"
                    valueClassName="text-[#bb4d00]"
                    labelClassName="text-[#e17100]"
                />
            </div>

            <button
                type="button"
                onClick={() => router.visit('/agency/research')}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[rgba(30,58,138,0.1)] text-sm leading-5 font-medium text-[#1e3a8a] hover:bg-[rgba(30,58,138,0.16)]"
            >
                <FileText className="size-4" />
                View Research Repository
            </button>
        </section>
    );
}

function SummaryRow({
    icon: Icon,
    label,
    value,
    className,
    iconClassName,
    valueClassName,
    labelClassName,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    className: string;
    iconClassName: string;
    valueClassName: string;
    labelClassName: string;
}) {
    return (
        <div
            className={`flex min-h-[70px] items-center gap-3 rounded-[10px] p-3 ${className}`}
        >
            <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${iconClassName}`}
            >
                <Icon className="size-4" />
            </span>
            <span className="min-w-0">
                <span
                    className={`block text-xs leading-4 font-medium ${labelClassName}`}
                >
                    {label}
                </span>
                <span
                    className={`mt-0.5 block text-lg leading-7 font-bold ${valueClassName}`}
                >
                    {value.toLocaleString()}
                </span>
            </span>
        </div>
    );
}
