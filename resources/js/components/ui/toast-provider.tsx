import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    LoaderCircle,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { getToastSnapshot, subscribeToToasts, toast } from '@/lib/toast';
import type { ToastRecord, ToastType } from '@/lib/toast';
import { cn } from '@/lib/utils';

type FlashMessage =
    | string
    | { title?: string; description?: string; message?: string }
    | null
    | undefined;

type FlashProps = Partial<
    Record<'success' | 'info' | 'warning' | 'error', FlashMessage>
>;

type InertiaPage = {
    url: string;
    props: Record<string, unknown> & { flash?: FlashProps };
};

const emptyToastSnapshot: ToastRecord[] = [];

const iconByType = {
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    error: XCircle,
    loading: LoaderCircle,
};

const colorByType: Record<ToastType, string> = {
    success: 'border-emerald-200 text-emerald-700',
    info: 'border-blue-200 text-blue-700',
    warning: 'border-amber-200 text-amber-700',
    error: 'border-red-200 text-red-700',
    loading: 'border-slate-200 text-[#1e3a8a]',
};

function normalizeFlash(message: FlashMessage, fallbackTitle: string) {
    if (typeof message === 'string') {
        return { title: fallbackTitle, description: message };
    }

    if (!message) {
        return null;
    }

    return {
        title: message.title ?? fallbackTitle,
        description: message.description ?? message.message,
    };
}

export function ToastProvider({
    children,
    initialPage,
}: {
    children: ReactNode;
    initialPage?: InertiaPage;
}) {
    const records = useSyncExternalStore(
        subscribeToToasts,
        getToastSnapshot,
        () => emptyToastSnapshot,
    );
    useEffect(() => {
        const showPageFlash = (page: InertiaPage) => {
            const flash = page.props.flash ?? {};
            const titles = {
                success: 'Action completed',
                info: 'Information',
                warning: 'Attention required',
                error: 'Action failed',
            } as const;

            (Object.keys(titles) as (keyof typeof titles)[]).forEach((type) => {
                const normalized = normalizeFlash(flash[type], titles[type]);

                if (!normalized) return;

                toast.show({ type, ...normalized });
            });
        };

        if (initialPage) showPageFlash(initialPage);

        return router.on('navigate', (event) => {
            showPageFlash(event.detail.page as InertiaPage);
        });
    }, [initialPage]);

    return (
        <>
            {children}
            <section
                aria-label="Notifications"
                className="pointer-events-none fixed top-3 right-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:top-5 sm:right-5"
            >
                {records.map((record) => (
                    <ToastItem key={record.id} record={record} />
                ))}
            </section>
        </>
    );
}

function ToastItem({ record }: { record: ToastRecord }) {
    const Icon = iconByType[record.type];
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (record.duration === null || paused) return;

        const timeout = window.setTimeout(
            () => toast.dismiss(record.id),
            record.duration,
        );

        return () => window.clearTimeout(timeout);
    }, [paused, record.createdAt, record.duration, record.id]);

    return (
        <article
            role={record.type === 'error' ? 'alert' : 'status'}
            aria-live={record.type === 'error' ? 'assertive' : 'polite'}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 text-sm shadow-[0_12px_32px_rgba(15,23,42,0.16)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3',
                colorByType[record.type],
            )}
        >
            <Icon
                aria-hidden="true"
                className={cn(
                    'mt-0.5 size-5 shrink-0',
                    record.type === 'loading' &&
                        'motion-safe:animate-spin motion-reduce:animate-none',
                )}
            />
            <div className="min-w-0 flex-1 text-slate-700">
                <p className="font-semibold text-slate-900">{record.title}</p>
                {record.description ? (
                    <p className="mt-1 leading-5 text-slate-600">
                        {record.description}
                    </p>
                ) : null}
            </div>
            <button
                type="button"
                onClick={() => toast.dismiss(record.id)}
                className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                aria-label={`Dismiss ${record.title} notification`}
            >
                <X className="size-4" />
            </button>
        </article>
    );
}
