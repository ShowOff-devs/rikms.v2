import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionCardProps = {
    title: string;
    icon: LucideIcon;
    iconClassName: string;
    children: ReactNode;
};

export function SectionCard({
    title,
    icon: Icon,
    iconClassName,
    children,
}: SectionCardProps) {
    return (
        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[65px] items-center gap-2.5 border-b border-[#f3f4f6] px-6">
                <span
                    className={cn(
                        'flex size-8 items-center justify-center rounded-[14px]',
                        iconClassName,
                    )}
                >
                    <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    {title}
                </h2>
            </div>
            <div className="px-6 py-6">{children}</div>
        </section>
    );
}

type FieldProps = {
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
};

export function Field({ label, error, hint, children }: FieldProps) {
    return (
        <label className="block min-w-0">
            <span className="mb-1.5 block text-xs leading-4 font-semibold text-[#4a5565]">
                {label}
            </span>
            {children}
            {error ? (
                <span className="mt-1 block text-xs leading-4 text-[#dc2626]">
                    {error}
                </span>
            ) : null}
            {hint ? (
                <span className="mt-2 block text-[11px] leading-4 text-[#99a1af]">
                    {hint}
                </span>
            ) : null}
        </label>
    );
}

export const inputClassName =
    'h-[42px] w-full rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm leading-5 text-[#364153] outline-none transition placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:bg-white focus:ring-2 focus:ring-[#1e3a8a]/10 disabled:cursor-not-allowed disabled:opacity-60';

export const textareaClassName =
    'min-h-[82px] w-full resize-none rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm leading-5 text-[#364153] outline-none transition placeholder:text-[#99a1af] focus:border-[#1e3a8a]/40 focus:bg-white focus:ring-2 focus:ring-[#1e3a8a]/10';

type ToggleSwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label: string;
};

export function ToggleSwitch({
    checked,
    onChange,
    disabled,
    label,
}: ToggleSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/30 disabled:cursor-not-allowed disabled:opacity-60',
                checked ? 'bg-[#1e3a8a]' : 'bg-[#d1d5db]',
            )}
        >
            <span
                className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] transition-transform',
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
            />
        </button>
    );
}

type ToggleRowProps = {
    title: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon?: LucideIcon;
    className?: string;
};

export function ToggleRow({
    title,
    description,
    checked,
    onChange,
    icon: Icon,
    className,
}: ToggleRowProps) {
    return (
        <div
            className={cn(
                'flex min-h-[62px] items-center justify-between gap-4 rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] px-4 py-3',
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                {Icon ? (
                    <Icon
                        className="size-4 shrink-0 text-[#6a7282]"
                        aria-hidden="true"
                    />
                ) : null}
                <span className="min-w-0">
                    <span className="block text-sm leading-5 font-medium text-[#364153]">
                        {title}
                    </span>
                    {description ? (
                        <span className="block text-xs leading-4 text-[#99a1af]">
                            {description}
                        </span>
                    ) : null}
                </span>
            </div>
            <ToggleSwitch checked={checked} onChange={onChange} label={title} />
        </div>
    );
}

type UnitInputProps = {
    value: number | '';
    onChange: (value: number | '') => void;
    unit: string;
    disabled?: boolean;
};

export function UnitInput({
    value,
    onChange,
    unit,
    disabled,
}: UnitInputProps) {
    return (
        <div className="relative">
            <input
                type="number"
                min="0"
                value={value}
                disabled={disabled}
                onChange={(event) => {
                    const nextValue = event.target.value;
                    onChange(nextValue === '' ? '' : Number(nextValue));
                }}
                className={cn(inputClassName, 'pr-24')}
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs leading-4 text-[#99a1af]">
                {unit}
            </span>
        </div>
    );
}
