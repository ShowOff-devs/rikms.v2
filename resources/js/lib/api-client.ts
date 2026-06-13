export type ApiEnvelope<TData, TMeta = Record<string, unknown>> = {
    message: string;
    data: TData;
    meta: TMeta;
};

export type ApiErrorPayload = {
    message: string;
    errors: Record<string, string[] | string>;
};

export class ApiError extends Error {
    status: number;
    errors: ApiErrorPayload['errors'];

    constructor(message: string, status: number, errors: ApiErrorPayload['errors'] = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

function csrfToken() {
    if (typeof document === 'undefined') {
        return null;
    }

    return document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');
}

function isFormData(body: RequestInit['body']) {
    return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function parsePayload(response: Response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return {};
    }
}

function firstError(errors: ApiErrorPayload['errors'] | undefined) {
    if (!errors) {
        return null;
    }

    for (const value of Object.values(errors)) {
        if (Array.isArray(value) && value[0]) {
            return value[0];
        }

        if (typeof value === 'string' && value) {
            return value;
        }
    }

    return null;
}

function fallbackErrorMessage(status: number) {
    if (status === 419) {
        return 'Your session expired. Refresh the page and try again.';
    }

    if (status === 413) {
        return 'The selected file is too large for the server upload limit.';
    }

    if (status === 422) {
        return 'Please check the submitted fields and try again.';
    }

    return 'Unable to complete API request.';
}

function redirectForUnauthorized(url: string) {
    if (typeof window === 'undefined') {
        return;
    }

    if (url.startsWith('/api/admin')) {
        window.location.assign('/admin/login');

        return;
    }

    if (url.startsWith('/api/agency')) {
        window.location.assign('/agency/login');
    }
}

export async function fetchApi<TData, TMeta = Record<string, unknown>>(
    url: string,
    init: RequestInit = {},
): Promise<ApiEnvelope<TData, TMeta>> {
    const token = csrfToken();
    const headers = new Headers(init.headers);

    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    if (token) {
        headers.set('X-CSRF-TOKEN', token);
    }

    if (init.body && !isFormData(init.body) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        credentials: 'same-origin',
        ...init,
        headers,
    });

    const payload = (await parsePayload(response)) as Partial<
        ApiEnvelope<TData> & ApiErrorPayload
    >;

    if (!response.ok) {
        if (response.status === 401) {
            redirectForUnauthorized(url);
        }

        throw new ApiError(
            firstError(payload.errors) ??
                payload.message ??
                fallbackErrorMessage(response.status),
            response.status,
            payload.errors ?? {},
        );
    }

    return payload as ApiEnvelope<TData, TMeta>;
}

export function apiMessage(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
        return firstError(error.errors) ?? error.message;
    }

    return error instanceof Error ? error.message : fallback;
}
