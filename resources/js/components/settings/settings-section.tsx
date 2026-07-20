import type { PropsWithChildren, ReactNode } from 'react';

export default function SettingsSection({
    children,
    title,
    description,
    icon,
    className = '',
}: PropsWithChildren<{
    title: string;
    description: string;
    icon?: ReactNode;
    className?: string;
}>) {
    return (
        <section
            className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}
        >
            <header className="flex gap-3 border-b border-slate-100 px-5 py-5 sm:px-7 dark:border-slate-800">
                {icon && (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {icon}
                    </div>
                )}
                <div>
                    <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {description}
                    </p>
                </div>
            </header>
            <div className="p-5 sm:p-7">{children}</div>
        </section>
    );
}
