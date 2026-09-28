import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    getAgencies,
    getAgencyAdminOptions,
} from '@/lib/admin/agencies-service';
import { getUnreadSystemNotificationCount } from '@/lib/admin/system-activity-service';

function jsonResponse(data: unknown, meta: unknown = {}) {
    return new Response(JSON.stringify({ message: 'ok', data, meta }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('agency management service', () => {
    it('passes server-side filters and preserves pagination and complete summary metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                [
                    {
                        id: 10,
                        name: 'Research Office',
                        short_name: 'RO',
                        type: 'Government Agency',
                        total_research: 4,
                        status: 'active',
                    },
                ],
                {
                    pagination: {
                        current_page: 2,
                        per_page: 9,
                        total: 19,
                        last_page: 3,
                    },
                    summary: {
                        total_agencies: 25,
                        active_agencies: 20,
                        inactive_agencies: 5,
                        total_research_records: 120,
                    },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await getAgencies({
            page: 2,
            perPage: 9,
            keyword: 'research office',
            type: 'government-agency',
            status: 'active',
            updatedDays: '30',
        });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/agencies?page=2&per_page=9&keyword=research+office&type=government-agency&status=active&updated_days=30',
            expect.any(Object),
        );
        expect(result.pagination.total).toBe(19);
        expect(result.summary).toEqual({
            totalAgencies: 25,
            activeAgencies: 20,
            inactiveAgencies: 5,
            totalResearchRecords: 120,
        });
        expect(result.agencies[0]?.shortName).toBe('RO');
    });

    it('loads every page of agency administrator options', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse(
                    [
                        {
                            id: 1,
                            name: 'First Admin',
                            email: 'first@example.test',
                            status: 'active',
                        },
                    ],
                    { pagination: { last_page: 2 } },
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    [
                        {
                            id: 2,
                            name: 'Second Admin',
                            email: 'second@example.test',
                            status: 'active',
                        },
                    ],
                    { pagination: { last_page: 2 } },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        await expect(getAgencyAdminOptions()).resolves.toHaveLength(2);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/api/admin/agency-admin-users?per_page=100&page=1',
            expect.any(Object),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/admin/agency-admin-users?per_page=100&page=2',
            expect.any(Object),
        );
    });
});

describe('shared admin notification badge service', () => {
    it('uses pagination totals instead of counting one fetched page', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(
                jsonResponse([], { pagination: { total: 137 } }),
            );
        vi.stubGlobal('fetch', fetchMock);

        await expect(getUnreadSystemNotificationCount()).resolves.toBe(137);
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/system-activity/notifications?status=unread&per_page=1',
            expect.any(Object),
        );
    });
});
