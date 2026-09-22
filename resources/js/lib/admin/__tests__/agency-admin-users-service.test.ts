import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    getAgencies,
    getAgencyAdminUsers,
} from '@/lib/admin/agency-admin-users-service';

function response(data: unknown, meta: unknown) {
    return new Response(JSON.stringify({ message: 'ok', data, meta }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('agency admin users service', () => {
    it('passes list filters and keeps full summary metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            response([], {
                pagination: {
                    current_page: 2,
                    per_page: 10,
                    total: 13,
                    last_page: 2,
                },
                summary: {
                    total_users: 20,
                    active_users: 15,
                    inactive_users: 5,
                    recently_created: 3,
                },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await getAgencyAdminUsers({
            page: 2,
            perPage: 10,
            keyword: 'Ada Admin',
            agencyId: '7',
            status: 'active',
        });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/agency-admin-users?page=2&per_page=10&keyword=Ada+Admin&agency_id=7&status=active',
            expect.any(Object),
        );
        expect(result.pagination.total).toBe(13);
        expect(result.summary).toEqual({
            totalUsers: 20,
            activeUsers: 15,
            inactiveUsers: 5,
            recentlyCreated: 3,
        });
    });

    it('loads every page of active agency choices', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                response([{ id: 1, name: 'One', short_name: 'ONE' }], {
                    pagination: { last_page: 2 },
                }),
            )
            .mockResolvedValueOnce(
                response([{ id: 2, name: 'Two', short_name: 'TWO' }], {
                    pagination: { last_page: 2 },
                }),
            );
        vi.stubGlobal('fetch', fetchMock);

        await expect(getAgencies()).resolves.toHaveLength(2);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/api/admin/agencies?per_page=100&status=active&page=1',
            expect.any(Object),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/admin/agencies?per_page=100&status=active&page=2',
            expect.any(Object),
        );
    });
});
