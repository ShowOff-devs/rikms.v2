export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';

export type ToastOptions = {
    id?: string;
    title: string;
    description?: string;
    type?: ToastType;
    duration?: number | null;
};

export type ToastRecord = Required<
    Pick<ToastOptions, 'id' | 'title' | 'type'>
> &
    Pick<ToastOptions, 'description'> & {
        duration: number | null;
        createdAt: number;
    };

export const TOAST_DURATIONS: Record<ToastType, number | null> = {
    success: 3000,
    info: 4000,
    warning: 5000,
    error: null,
    loading: null,
};

const MAX_VISIBLE_TOASTS = 5;
let records: ToastRecord[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function toastKey(options: ToastOptions) {
    return `${options.type ?? 'info'}:${options.description ?? options.title}`;
}

function upsert(options: ToastOptions) {
    const type = options.type ?? 'info';
    const duplicate = options.id
        ? records.find((record) => record.id === options.id)
        : records.find(
              (record) => toastKey(record) === toastKey({ ...options, type }),
          );
    const id = options.id ?? duplicate?.id ?? `toast-${++sequence}`;
    const record: ToastRecord = {
        id,
        type,
        title: options.title,
        description: options.description,
        duration:
            options.duration === undefined
                ? TOAST_DURATIONS[type]
                : options.duration,
        createdAt: Date.now(),
    };

    records = [
        record,
        ...records.filter(
            (item) => item.id !== id && toastKey(item) !== toastKey(record),
        ),
    ].slice(0, MAX_VISIBLE_TOASTS);
    emit();

    return id;
}

export const toast = {
    show: upsert,
    success: (title: string, description?: string, id?: string) =>
        upsert({ id, type: 'success', title, description }),
    info: (title: string, description?: string, id?: string) =>
        upsert({ id, type: 'info', title, description }),
    warning: (title: string, description?: string, id?: string) =>
        upsert({ id, type: 'warning', title, description }),
    error: (title: string, description?: string, id?: string) =>
        upsert({ id, type: 'error', title, description }),
    loading: (title: string, description?: string, id?: string) =>
        upsert({ id, type: 'loading', title, description }),
    dismiss(id: string) {
        const next = records.filter((record) => record.id !== id);

        if (next.length !== records.length) {
            records = next;
            emit();
        }
    },
    update(id: string, options: Omit<ToastOptions, 'id'>) {
        return upsert({ ...options, id });
    },
};

export function subscribeToToasts(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function getToastSnapshot() {
    return records;
}

export function resetToastsForTests() {
    records = [];
    sequence = 0;
    emit();
}
