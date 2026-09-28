import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    flagDuplicateResearchMatch,
    getFlaggedResearchRecords,
} from '@/lib/admin/research-moderation-service';
import type { DuplicateResearchMatch } from '@/types/research-moderation';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('research moderation service', () => {
    it('uses complete server-side moderation filters and summary metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    message: 'ok',
                    data: [
                        {
                            id: 17,
                            title: 'Policy Review',
                            authors: ['Reviewer'],
                            keywords: ['policy'],
                            publication_year: 2025,
                            category: 'Governance',
                            status: 'rejected',
                            moderation_issue_type: 'policy_noncompliance',
                            moderation_note: 'Policy evidence is incomplete.',
                            agency: { short_name: 'RA' },
                            uploader: {
                                name: 'Agency Admin',
                                role: 'agency_admin',
                            },
                        },
                    ],
                    meta: {
                        pagination: {
                            current_page: 2,
                            per_page: 8,
                            total: 9,
                            last_page: 2,
                        },
                        summary: {
                            flagged_research_records: 9,
                            pending_review: 0,
                            resolved_issues: 0,
                        },
                        filter_options: {
                            agencies: ['RA'],
                            years: ['2025'],
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

        const result = await getFlaggedResearchRecords(
            {
                search: 'Policy Review',
                agency: 'RA',
                issueType: 'policy_noncompliance',
                year: '2025',
                status: 'flagged',
            },
            2,
            8,
        );

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/research?moderation=1&page=2&per_page=8&keyword=Policy+Review&agency=RA&issue_type=policy_noncompliance&year=2025&moderation_status=flagged',
            expect.any(Object),
        );
        expect(result.pagination.total).toBe(9);
        expect(result.summary.flaggedResearchRecords).toBe(9);
        expect(result.records[0]).toMatchObject({
            id: '17',
            status: 'flagged',
            issueType: 'policy_noncompliance',
        });
    });

    it('flags a duplicate pair through the dedicated review endpoint', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    message: 'Duplicate match flagged for review.',
                    data: {
                        pair_key: '10:20',
                        matching_research_id: 20,
                    },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);
        const match: DuplicateResearchMatch = {
            id: '10:20',
            originalResearchId: '10',
            matchingResearchId: '20',
            originalTitle: 'Original research',
            matchingTitle: 'Matching research',
            originalAgency: 'Agency A',
            matchingAgency: 'Agency B',
            originalStatus: 'published',
            matchingStatus: 'published',
            similarityScore: 100,
            detectedAt: '2026-09-22T00:00:00.000Z',
        };

        await flagDuplicateResearchMatch(
            match,
            'Exact title requires a manual duplicate review.',
        );

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/admin/research-moderation/duplicates/flag',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    original_research_id: 10,
                    matching_research_id: 20,
                    notes: 'Exact title requires a manual duplicate review.',
                }),
            }),
        );
    });
});
