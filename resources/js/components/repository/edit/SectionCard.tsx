import type { ReactNode } from 'react';

export function SectionCard({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {eyebrow ? (
                <p className="text-[10px] leading-[15px] font-bold text-[#99a1af] uppercase">
                    {eyebrow}
                </p>
            ) : null}
            <h2 className="mt-1 text-[15.2px] leading-[22.8px] font-bold text-[#101828]">
                {title}
            </h2>
            {description ? (
                <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                    {description}
                </p>
            ) : null}
            <div className="mt-5">{children}</div>
        </section>
    );
}

export function FieldLabel({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-xs leading-4 font-semibold text-[#364153]">
                {label}
            </span>
            <div className="mt-1.5">{children}</div>
            {error ? (
                <p className="mt-1 text-xs leading-4 font-medium text-[#e7000b]">
                    {error}
                </p>
            ) : null}
        </label>
    );
}

export const inputClass =
    'h-10 w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#1e2939] outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10';

export const textareaClass =
    'min-h-[112px] w-full resize-y rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm leading-5 text-[#1e2939] outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10';
