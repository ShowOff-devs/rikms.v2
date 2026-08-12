import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 dark:bg-slate-950">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-blue-700" />
            <div className="pointer-events-none absolute -top-32 right-0 size-96 rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-950/30" />
            <main className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div className="border-b border-slate-100 px-6 pt-7 pb-6 text-center sm:px-9 dark:border-slate-800">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 focus-visible:outline-none"
                        >
                            <img
                                src="/assets/rikms-logo.png"
                                alt="RIKMS"
                                className="h-14 w-auto"
                            />
                        </Link>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                {title}
                            </h1>
                            <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-7 sm:px-9">{children}</div>
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
                    Research and Innovation Knowledge Management System
                </div>
            </main>
        </div>
    );
}
