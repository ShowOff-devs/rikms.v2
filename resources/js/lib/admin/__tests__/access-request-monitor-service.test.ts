import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccessRequestMonitorRecords } from '@/lib/admin/access-request-monitor-service';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('access request monitoring service', () => {
    it('uses server filters and authoritative audit and pagination metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    message: 'ok',
                    data: [
                        {
                            id: 5,
                            research_id: 9,
                            requester_name: 'Ada Requester',
                            requester_email: 'ada@example.test',
                            requester_affiliation: 'Policy Institute',
                            status: 'approved',
                            reviewed_at: '2026-09-21T02:00:00.000Z',
                            audit_status: 'unreviewed',
                            processing_duration_seconds: 3600,
                            audit_trail: [],
                            research: {
                                id: 9,
                                title: 'Policy Research',
                                agency: {
                                    id: 3,
                                    name: 'Research Agency',
                                    short_name: 'RA',
                                },
                            },
                        },
                    ],
                    meta: {
                        pagination: {
                            current_page: 2,
                            per_page: 8,
                            total: 12,
                            last_page: 2,
                        },
                        summary: {
                            total: 12,
                            pending: 2,
                            approved: 8,
                            denied: 2,
                        },
                        requests_by_agency: [{ agency: 'RA', count: 12 }],
                        filter_options: {
                            agencies: ['RA'],
                            organizations: ['Policy Institute'],
                        },
                    },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await getAccessRequestMonitorRecords(
            {
                search: 'Ada Policy',
                agency: 'RA',
                status: 'approved',
                dateRange: 'all',
                organization: 'Policy Institute',
            },
            2,
            8,
        );

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/access-monitoring?search=Ada+Policy&status=approved&agency=RA&organization=Policy+Institute&page=2&per_page=8',
            expect.any(Object),
        );
        expect(result.pagination.total).toBe(12);
        expect(result.summary.approved).toBe(8);
        expect(result.requestsByAgency).toEqual([{ agency: 'RA', count: 12 }]);
        expect(result.records[0]).toMatchObject({
            auditStatus: 'unreviewed',
            processingDuration: '1 hour',
        });
    });
});
