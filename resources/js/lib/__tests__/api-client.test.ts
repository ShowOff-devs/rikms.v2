import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    apiErrorToastDetails,
    ApiError,
    apiMessage,
    fetchApi,
    SESSION_EXPIRED_MESSAGE,
    sessionExpiredMessageFromLocation,
} from '@/lib/api-client';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('API session expiry handling', () => {
    it('replaces a raw CSRF error and redirects protected requests once', async () => {
        const assign = vi.fn();
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    message: 'CSRF token mismatch.',
                    errors: {},
                }),
                {
                    status: 419,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        );

        vi.stubGlobal('document', {
            querySelector: vi.fn().mockReturnValue({
                getAttribute: () => 'test-csrf-token',
            }),
        });
        vi.stubGlobal('window', {
            location: {
                pathname: '/admin/users',
                search: '',
                assign,
            },
            sessionStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
        });
        vi.stubGlobal('fetch', fetchMock);

        const request = fetchApi('/api/admin/users/7', {
            method: 'PATCH',
            body: JSON.stringify({ name: 'Updated name' }),
        });

        await expect(request).rejects.toMatchObject({
            message: SESSION_EXPIRED_MESSAGE,
            status: 419,
        });
        expect(assign).toHaveBeenCalledOnce();
        expect(assign).toHaveBeenCalledWith(
            '/admin/login?reason=session-expired',
        );

        await expect(fetchApi('/api/admin/users')).rejects.toMatchObject({
            message: SESSION_EXPIRED_MESSAGE,
            status: 419,
        });
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('returns the session-expired message from the login URL', () => {
        vi.stubGlobal('window', {
            location: {
                search: '?reason=session-expired',
            },
        });

        expect(sessionExpiredMessageFromLocation()).toBe(
            SESSION_EXPIRED_MESSAGE,
        );
    });

    it('does not expose server exception messages through UI helpers', () => {
        expect(
            apiMessage(
                new ApiError('Sensitive exception details.', 500),
                'Unable to save changes.',
            ),
        ).toBe('Unable to save changes.');
    });
});

describe('API error toast details', () => {
    it('keeps conflicts actionable and hides server exception details', () => {
        expect(apiErrorToastDetails(409, 'Version conflict.')).toMatchObject({
            type: 'error',
            title: 'Changes could not be saved',
        });
        expect(apiErrorToastDetails(422)).toMatchObject({
            type: 'warning',
            title: 'Check the highlighted fields',
        });
        expect(apiErrorToastDetails(500, 'Sensitive exception')).toMatchObject({
            description:
                'The service encountered a problem. Please try again.',
        });
    });
});
