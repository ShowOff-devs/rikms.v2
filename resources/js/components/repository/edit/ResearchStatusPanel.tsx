import {
    CalendarDays,
    Globe2,
    LockKeyhole,
    Radio,
    ShieldCheck,
} from 'lucide-react';
import type { EditDocumentErrors } from '@/components/repository/edit/EditDocumentPage';
import {
    FieldLabel,
    inputClass,
} from '@/components/repository/edit/SectionCard';
import {
    repositoryAccessTypeLabels,
    repositoryStatusLabels,
} from '@/data/repository-display';
import { cn } from '@/lib/utils';
import type {
    RepositoryAccessType,
    RepositoryStatus,
    RepositoryUpdatePayload,
} from '@/types/repository';

const statusOptions: RepositoryStatus[] = ['draft', 'published', 'archived'];
const accessOptions: Array<{
    value: RepositoryAccessType;
    label: string;
    description: string;
}> = [
    {
        value: 'public',
        label: 'Public Download',
        description: 'Visible and downloadable by authorized users.',
    },
    {
        value: 'request-access',
        label: 'Request Access',
        description: 'Users submit access requests before download.',
    },
    {
        value: 'restricted',
        label: 'Restricted',
        description: 'Hidden from public access workflows.',
    },
    {
        value: 'embargo',
        label: 'Embargo',
        description: 'Locked until a configured release date.',
    },
    {
        value: 'external-link',
        label: 'External Link',
        description: 'Points to an outside repository URL.',
    },
];

export function ResearchStatusPanel({
    status,
    accessType,
    embargoUntil,
    externalLink,
    errors,
    disabled = false,
    onAccessChange,
    onChange,
}: {
    status: RepositoryStatus;
    accessType: RepositoryAccessType;
    embargoUntil: string;
    externalLink: string;
    errors: EditDocumentErrors;
    disabled?: boolean;
    onAccessChange: (accessType: RepositoryAccessType) => void;
    onChange: (patch: Partial<RepositoryUpdatePayload>) => void;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <p className="text-[10px] leading-[15px] font-bold text-[#99a1af] uppercase">
                Repository Controls
            </p>
            <h2 className="mt-1 text-[15.2px] font-bold text-[#101828]">
                Status and Access
            </h2>

            <div className="mt-4">
                <p className="text-xs font-semibold text-[#364153]">
                    Research Status
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                    {statusOptions.map((option) => (
                        <span
                            key={option}
                            className={cn(
                                'inline-flex h-9 items-center justify-center rounded-[10px] border text-xs font-semibold',
                                status === option
                                    ? 'border-[#1e3a8a] bg-[#eff6ff] text-[#1e3a8a]'
                                    : 'border-[#e5e7eb] text-[#6a7282]',
                            )}
                        >
                            {repositoryStatusLabels[option]}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-5">
                <p className="text-xs font-semibold text-[#364153]">
                    Access Control
                </p>
                {errors.accessType ? (
                    <p className="mt-1 text-xs text-[#e7000b]">
                        {errors.accessType}
                    </p>
                ) : null}
                <div className="mt-2 space-y-2">
                    {accessOptions.map((option) => {
                        const isSelected = accessType === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onAccessChange(option.value)}
                                disabled={disabled}
                                className={cn(
                                    'flex w-full gap-3 rounded-[12px] border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60',
                                    isSelected
                                        ? 'border-[#1e3a8a] bg-[#eff6ff]'
                                        : 'border-[#e5e7eb] bg-white',
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                                        isSelected
                                            ? 'bg-[#1e3a8a] text-white'
                                            : 'bg-[#f3f4f6] text-[#99a1af]',
                                    )}
                                >
                                    {option.value === 'public' ? (
                                        <ShieldCheck className="size-3.5" />
                                    ) : option.value === 'external-link' ? (
                                        <Globe2 className="size-3.5" />
                                    ) : option.value === 'embargo' ? (
                                        <CalendarDays className="size-3.5" />
                                    ) : option.value === 'restricted' ? (
                                        <LockKeyhole className="size-3.5" />
                                    ) : (
                                        <Radio className="size-3.5" />
                                    )}
                                </span>
                                <span>
                                    <span className="block text-xs font-bold text-[#101828]">
                                        {option.label}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-4 text-[#6a7282]">
                                        {option.description}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {accessType === 'embargo' ? (
                <div className="mt-4">
                    <FieldLabel
                        label="Embargo Until"
                        error={errors.embargoUntil}
                    >
                        <input
                            type="date"
                            value={embargoUntil}
                            onChange={(event) =>
                                onChange({ embargoUntil: event.target.value })
                            }
                            disabled={disabled}
                            className={inputClass}
                        />
                    </FieldLabel>
                </div>
            ) : null}

            {accessType === 'external-link' ? (
                <div className="mt-4">
                    <FieldLabel
                        label={repositoryAccessTypeLabels['external-link']}
                        error={errors.externalLink}
                    >
                        <input
                            value={externalLink}
                            onChange={(event) =>
                                onChange({ externalLink: event.target.value })
                            }
                            disabled={disabled}
                            className={inputClass}
                            placeholder="https://repository.example/document"
                        />
                    </FieldLabel>
                </div>
            ) : null}
        </section>
    );
}
