import {
    AlertTriangle,
    CheckCircle2,
    LoaderCircle,
    Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocumentSyncState =
    | 'unverified'
    | 'synced'
    | 'unsaved'
    | 'saving'
    | 'failed';

const status = {
    unverified: {
        label: 'Loaded',
        Icon: Pencil,
        classes: 'border-slate-200 bg-slate-50 text-slate-600',
    },
    synced: {
        label: 'Synced',
        Icon: CheckCircle2,
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    unsaved: {
        label: 'Unsaved changes',
        Icon: Pencil,
        classes: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    saving: {
        label: 'Saving',
        Icon: LoaderCircle,
        classes: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    failed: {
        label: 'Save failed',
        Icon: AlertTriangle,
        classes: 'border-red-200 bg-red-50 text-red-700',
    },
} as const;

export function DocumentSyncStatus({ state }: { state: DocumentSyncState }) {
    const current = status[state];

    return (
        <span
            role="status"
            className={cn(
                'inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
                current.classes,
            )}
        >
            <current.Icon
                className={cn(
                    'size-3.5',
                    state === 'saving' &&
                        'motion-safe:animate-spin motion-reduce:animate-none',
                )}
            />
            {current.label}
        </span>
    );
}
