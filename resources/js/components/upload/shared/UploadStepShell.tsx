import type { ReactNode } from 'react';

type UploadStepShellProps = {
    title: string;
    description: string;
    stepLabel: string;
    children: ReactNode;
    footer?: ReactNode;
};

export default function UploadStepShell({
    title,
    description,
    stepLabel,
    children,
    footer,
}: UploadStepShellProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#1e3a8a] uppercase">
                    {stepLabel}
                </span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#101828]">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6a7282]">
                {description}
            </p>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-5">{footer}</div> : null}
        </section>
    );
}
