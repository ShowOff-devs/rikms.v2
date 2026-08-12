import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
});
