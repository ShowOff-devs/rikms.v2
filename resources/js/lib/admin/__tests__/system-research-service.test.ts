import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSystemResearchRecords } from '@/lib/admin/system-research-service';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('system research service', () => {
    it('uses server pagination and preserves authoritative research metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    message: 'ok',
                    data: [
                        {
                            id: 14,
                            title: 'Terminal Report',
                            authors: ['Researcher One'],
                            agency_id: 7,
                            agency: {
                                name: 'Research Office',
                                short_name: 'RO',
                            },
                            publication_year: null,
                            status: 'submitted',
                            category: 'Governance',
                            sdgs: ['SDG 16'],
                            access_level: 'public',
                            downloads: 3,
                            views: 11,
                            document_type: 'terminal-report',
                            created_at: '2026-09-20T00:00:00.000Z',
                        },
                    ],
                    meta: {
                        pagination: {
                            current_page: 2,
                            per_page: 10,
                            total: 18,
                            last_page: 2,
                        },
                        summary: {
                            total_records: 18,
                            published: 9,
                            under_review: 4,
                            total_views: 120,
                        },
                        filter_options: {
                            agencies: ['RO'],
                            years: ['2026'],
                            categories: ['Governance'],
                            sdgs: ['SDG 16'],
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

        const result = await getSystemResearchRecords(
            {
                search: 'climate report',
                agency: '7',
                status: 'submitted',
                year: '2026',
                category: 'Governance',
                sdg: 'SDG 16',
                documentType: 'terminal-report',
            },
            2,
            10,
        );

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/research?page=2&per_page=10&keyword=climate+report&agency=7&status=submitted&year=2026&category=Governance&sdg=SDG+16&document_type=terminal-report',
            expect.any(Object),
        );
        expect(result.pagination.total).toBe(18);
        expect(result.summary).toEqual({
            totalRecords: 18,
            published: 9,
            underReview: 4,
            totalViews: 120,
        });
        expect(result.filterOptions.agencies).toEqual(['RO']);
        expect(result.records[0]).toMatchObject({
            year: null,
            status: 'submitted',
            views: 11,
            documentType: 'terminal-report',
        });
    });
});
