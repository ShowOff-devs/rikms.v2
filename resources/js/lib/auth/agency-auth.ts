import type {
    AgencyAuthSession,
    AgencyLoginPayload,
    AgencyOption,
    AgencyPasswordResetPayload,
} from '@/types/auth';

const AGENCY_SESSION_KEY = 'rikms.agency.session';
const AGENCY_REMEMBERED_SESSION_KEY = 'rikms.agency.session.remembered';

export const agencyOptions: AgencyOption[] = [
    {
        id: 'dost-xi',
        shortName: 'DOST XI',
        fullName: 'Department of Science and Technology - Region XI',
        adminEmailHint: 'admin@dostxi.gov.ph',
    },
    {
        id: 'ched-xi',
        shortName: 'CHED XI',
        fullName: 'Commission on Higher Education - Region XI',
        adminEmailHint: 'admin@chedxi.gov.ph',
    },
    {
        id: 'neda-xi',
        shortName: 'NEDA XI',
        fullName: 'National Economic and Development Authority - Region XI',
        adminEmailHint: 'admin@nedaxi.gov.ph',
    },
    {
        id: 'dti-xi',
        shortName: 'DTI XI',
        fullName: 'Department of Trade and Industry - Region XI',
        adminEmailHint: 'admin@dtixi.gov.ph',
    },
    {
        id: 'dict-xi',
        shortName: 'DICT XI',
        fullName:
            'Department of Information and Communications Technology - Region XI',
        adminEmailHint: 'admin@dictxi.gov.ph',
    },
    {
        id: 'rhrdc-xi',
        shortName: 'RHRDC XI',
        fullName: 'Regional Health Research and Development Consortium XI',
        adminEmailHint: 'admin@rhrdcxi.org.ph',
    },
    {
        id: 'drieerdc',
        shortName: 'DRIEERDC',
        fullName:
            'Davao Region Industry Energy and Emerging Technology Research and Development Consortium',
        adminEmailHint: 'admin@drieerdc.org.ph',
    },
    {
        id: 'smaarrdec',
        shortName: 'SMAARRDEC',
        fullName:
            'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        adminEmailHint: 'admin@smaarrdec.org.ph',
    },
    {
        id: 'usep',
        shortName: 'USEP',
        fullName: 'University of Southeastern Philippines',
        adminEmailHint: 'admin@usep.edu.ph',
    },
];

const mockNetworkDelay = (duration = 900) =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

const isBrowser = () => typeof window !== 'undefined';

const readStoredSession = (): AgencyAuthSession | null => {
    if (!isBrowser()) {
        return null;
    }

    const storedSession =
        window.sessionStorage.getItem(AGENCY_SESSION_KEY) ??
        window.localStorage.getItem(AGENCY_REMEMBERED_SESSION_KEY);

    if (!storedSession) {
        return null;
    }

    try {
        return JSON.parse(storedSession) as AgencyAuthSession;
    } catch {
        clearAgencySession();

        return null;
    }
};

const storeSession = (session: AgencyAuthSession) => {
    if (!isBrowser()) {
        return;
    }

    clearAgencySession();

    if (session.remember) {
        window.localStorage.setItem(
            AGENCY_REMEMBERED_SESSION_KEY,
            JSON.stringify(session),
        );

        return;
    }

    window.sessionStorage.setItem(AGENCY_SESSION_KEY, JSON.stringify(session));
};

export function getAgencyOptions() {
    return agencyOptions;
}

export function getAgencyOption(agencyId: string) {
    return agencyOptions.find((agency) => agency.id === agencyId) ?? null;
}

export function getAgencySession() {
    return readStoredSession();
}

export function clearAgencySession() {
    if (!isBrowser()) {
        return;
    }

    window.sessionStorage.removeItem(AGENCY_SESSION_KEY);
    window.localStorage.removeItem(AGENCY_REMEMBERED_SESSION_KEY);
}

export async function signInToAgencyPortal(payload: AgencyLoginPayload) {
    await mockNetworkDelay();

    const agency = getAgencyOption(payload.agencyId);

    if (!agency) {
        throw new Error('Please select a valid agency to continue.');
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedPassword = payload.password.trim().toLowerCase();

    // Temporary mock rules for frontend-only implementation.
    // Replace this function with the Laravel API request once backend auth is available.
    if (
        normalizedEmail === 'invalid@agency.gov.ph' ||
        normalizedPassword === 'invalid'
    ) {
        throw new Error(
            'Invalid credentials. Please verify your agency account details and try again.',
        );
    }

    const session: AgencyAuthSession = {
        agencyId: agency.id,
        agencyName: agency.shortName,
        email: normalizedEmail,
        portal: 'agency-admin',
        remember: payload.remember,
        loggedInAt: new Date().toISOString(),
    };

    storeSession(session);

    return session;
}

export async function requestAgencyPasswordReset(
    payload: AgencyPasswordResetPayload,
) {
    await mockNetworkDelay(700);

    const agency = getAgencyOption(payload.agencyId);

    if (!agency) {
        throw new Error('Please select the agency account you need help with.');
    }

    return {
        message: `Password reset instructions for ${agency.shortName} will be sent to ${payload.email.trim()}.`,
    };
}
