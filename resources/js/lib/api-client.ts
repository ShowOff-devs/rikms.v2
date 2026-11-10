import { toast } from '@/lib/toast';

export type ApiEnvelope<TData, TMeta = Record<string, unknown>> = {
    message: string;
    data: TData;
    meta: TMeta;
};

export type ApiErrorPayload = {
    message: string;
    errors: Record<string, string[] | string>;
};

export const SESSION_EXPIRED_MESSAGE =
    'Your session expired. Please sign in again to continue.';

const SESSION_EXPIRED_REASON = 'session-expired';
let sessionRedirectPending = false;

export class ApiError extends Error {
    status: number;
    errors: ApiErrorPayload['errors'];

    constructor(
        message: string,
        status: number,
        errors: ApiErrorPayload['errors'] = {},
    ) {
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
        return SESSION_EXPIRED_MESSAGE;
    }

    if (status === 413) {
        return 'The selected file is too large for the server upload limit.';
    }

    if (status === 422) {
        return 'Please check the submitted fields and try again.';
    }

    return 'Unable to complete API request.';
}

export function apiErrorToastDetails(status: number, message?: string) {
    if (status === 401) {
        return {
            type: 'error' as const,
            title: 'Authentication required',
            description: 'Please sign in again to continue.',
        };
    }

    if (status === 403) {
        return {
            type: 'error' as const,
            title: 'Permission denied',
            description: 'You do not have permission to perform this action.',
        };
    }

    if (status === 409) {
        return {
            type: 'error' as const,
            title: 'Changes could not be saved',
            description:
                message ??
                'This record changed elsewhere. Refresh and review the latest version before retrying.',
        };
    }

    if (status === 419) {
        return {
            type: 'error' as const,
            title: 'Session expired',
            description: SESSION_EXPIRED_MESSAGE,
        };
    }

    if (status === 422) {
        return {
            type: 'warning' as const,
            title: 'Check the highlighted fields',
            description:
                message ?? 'Correct the validation issues and try again.',
        };
    }

    if (status === 429) {
        return {
            type: 'warning' as const,
            title: 'Too many requests',
            description: 'Please wait a moment before trying again.',
        };
    }

    return {
        type: 'error' as const,
        title: 'Unable to complete the request',
        description:
            status >= 500
                ? 'The service encountered a problem. Please try again.'
                : (message ?? 'Check your connection and try again.'),
    };
}

function showApiErrorToast(status: number, message?: string) {
    toast.show(apiErrorToastDetails(status, message));
}

function loginPathForUrl(url: string) {
    if (url.startsWith('/api/admin')) {
        return '/admin/login';
    }

    if (url.startsWith('/api/agency')) {
        return '/agency/login';
    }

    return null;
}

type PortalLoginPath = '/admin/login' | '/agency/login';

export function sessionExpiredMessageFromLocation() {
    if (typeof window === 'undefined') {
        return null;
    }

    return new URLSearchParams(window.location.search).get('reason') ===
        SESSION_EXPIRED_REASON
        ? SESSION_EXPIRED_MESSAGE
        : null;
}

export function redirectToFreshLogin(loginPath: PortalLoginPath) {
    if (typeof window === 'undefined' || sessionRedirectPending) {
        return;
    }

    if (
        window.location.pathname === loginPath &&
        sessionExpiredMessageFromLocation()
    ) {
        return;
    }

    sessionRedirectPending = true;
    window.location.assign(`${loginPath}?reason=${SESSION_EXPIRED_REASON}`);
}

function redirectForExpiredSession(url: string) {
    const loginPath = loginPathForUrl(url);

    if (loginPath) {
        redirectToFreshLogin(loginPath);
    }
}

function redirectForUnauthorized(url: string) {
    if (typeof window === 'undefined') {
        return;
    }

    const loginPath = loginPathForUrl(url);

    if (!loginPath || window.location.pathname === loginPath) {
        return;
    }

    const redirectKey = `rikms.auth.redirected.${loginPath}`;

    if (window.sessionStorage.getItem(redirectKey) === 'true') {
        return;
    }

    window.sessionStorage.setItem(redirectKey, 'true');

    if (url.startsWith('/api/admin')) {
        window.location.assign(loginPath);

        return;
    }

    if (url.startsWith('/api/agency')) {
        window.location.assign(loginPath);
    }
}

export async function fetchApi<TData, TMeta = Record<string, unknown>>(
    url: string,
    init: RequestInit = {},
): Promise<ApiEnvelope<TData, TMeta>> {
    if (sessionRedirectPending && loginPathForUrl(url)) {
        throw new ApiError(SESSION_EXPIRED_MESSAGE, 419);
    }

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

    let response: Response;

    try {
        response = await fetch(url, {
            credentials: 'same-origin',
            ...init,
            headers,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }

        toast.error(
            'Network interruption',
            'The request could not reach the server. Check your connection and try again.',
        );

        throw error;
    }

    if (response.ok && typeof window !== 'undefined') {
        window.sessionStorage.removeItem('rikms.auth.redirected./admin/login');
        window.sessionStorage.removeItem('rikms.auth.redirected./agency/login');
    }

    const payload = (await parsePayload(response)) as Partial<
        ApiEnvelope<TData> & ApiErrorPayload
    >;

    if (!response.ok) {
        const errorMessage =
            firstError(payload.errors) ??
            payload.message ??
            fallbackErrorMessage(response.status);

        showApiErrorToast(response.status, errorMessage);

        if (response.status === 419) {
            redirectForExpiredSession(url);

            throw new ApiError(
                SESSION_EXPIRED_MESSAGE,
                response.status,
                payload.errors ?? {},
            );
        }

        if (response.status === 401) {
            redirectForUnauthorized(url);
        }

        throw new ApiError(
            errorMessage,
            response.status,
            payload.errors ?? {},
        );
    }

    return payload as ApiEnvelope<TData, TMeta>;
}

export function apiMessage(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
        if (error.status >= 500) {
            return fallback;
        }

        return firstError(error.errors) ?? error.message;
    }

    return error instanceof Error ? error.message : fallback;
}
