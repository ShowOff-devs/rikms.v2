import { usePage } from '@inertiajs/react';
import type {
    AgencyAuthSession,
    AgencyLoginPayload,
    AgencyPasswordResetPayload,
} from '@/types/auth';

const LEGACY_AGENCY_SESSION_KEYS = [
    'rikms.agency.session',
    'rikms.agency.session.remembered',
];

const isBrowser = () => typeof window !== 'undefined';

type SharedAuthUser = {
    id: number;
    email: string;
    role?: string;
    agency_id?: number | null;
    agency?: {
        slug?: string | null;
        short_name?: string | null;
        name?: string | null;
    } | null;
};

type InertiaPagePayload = {
    props?: {
        auth?: {
            user?: SharedAuthUser | null;
        };
    };
};

type LoginResponsePayload = {
    redirect?: string;
};

function getSharedAuthUser(): SharedAuthUser | null {
    if (!isBrowser()) {
        return null;
    }

    const page = document.getElementById('app')?.dataset.page;

    if (!page) {
        return null;
    }

    try {
        return (
            (JSON.parse(page) as InertiaPagePayload).props?.auth?.user ?? null
        );
    } catch {
        return null;
    }
}

function makeSessionFromUser(user: SharedAuthUser): AgencyAuthSession | null {
    if (user.role !== 'agency_admin' || !user.agency_id) {
        return null;
    }

    return {
        agencyId: user.agency?.slug ?? String(user.agency_id),
        agencyName:
            user.agency?.short_name ?? user.agency?.name ?? 'Agency Admin',
        email: user.email,
        portal: 'agency-admin',
        remember: false,
        loggedInAt: new Date().toISOString(),
    };
}

function csrfToken() {
    if (!isBrowser()) {
        return null;
    }

    return document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');
}

export function getAgencySession() {
    const user = getSharedAuthUser();

    return user ? makeSessionFromUser(user) : null;
}

export function useAgencySession() {
    const props = usePage().props as NonNullable<InertiaPagePayload['props']>;
    const user = props.auth?.user ?? null;

    return user ? makeSessionFromUser(user) : null;
}

export function clearAgencySession() {
    if (!isBrowser()) {
        return;
    }

    for (const key of LEGACY_AGENCY_SESSION_KEYS) {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
    }
}

export async function signInToAgencyPortal(payload: AgencyLoginPayload) {
    if (!payload.agencyId) {
        throw new Error('Please select a valid agency to continue.');
    }

    const normalizedEmail = payload.email.trim().toLowerCase();

    const loginPayload = await fetch('/agency/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken() ? { 'X-CSRF-TOKEN': csrfToken() ?? '' } : {}),
        },
        body: JSON.stringify({
            agency: payload.agencyId,
            email: normalizedEmail,
            password: payload.password,
            remember: payload.remember,
        }),
    }).then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as
            | (LoginResponsePayload & {
                  message?: string;
                  errors?: Record<string, string[]>;
              })
            | undefined;

        if (!response.ok) {
            throw new Error(
                body?.message ??
                    body?.errors?.email?.[0] ??
                    'Invalid credentials. Please verify your agency account details and try again.',
            );
        }

        return body ?? {};
    });

    const session: AgencyAuthSession = {
        agencyId: payload.agencyId,
        agencyName: payload.agencyId,
        email: normalizedEmail,
        portal: 'agency-admin',
        remember: payload.remember,
        loggedInAt: new Date().toISOString(),
    };

    return {
        ...session,
        redirect: loginPayload.redirect,
    };
}

export async function requestAgencyPasswordReset(
    payload: AgencyPasswordResetPayload,
) {
    if (!payload.agencyId) {
        throw new Error('Please select the agency account you need help with.');
    }

    const response = await fetch('/forgot-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken() ? { 'X-CSRF-TOKEN': csrfToken() ?? '' } : {}),
        },
        body: JSON.stringify({
            agency: payload.agencyId,
            email: payload.email.trim().toLowerCase(),
        }),
    });

    const body = (await response.json().catch(() => ({}))) as
        | { message?: string; status?: string; errors?: Record<string, string[]> }
        | undefined;

    if (!response.ok) {
        throw new Error(
            body?.message ??
                body?.errors?.email?.[0] ??
                'Unable to send password reset instructions.',
        );
    }

    return {
        message:
            body?.status ??
            body?.message ??
            'Password reset instructions will be sent if the account exists.',
    };
}
