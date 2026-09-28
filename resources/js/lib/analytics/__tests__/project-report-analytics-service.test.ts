import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    projectReportAnalyticsPath,
    projectReportDetailPath,
    projectReportReturnPath,
    projectReportStateFromSearch,
} from '@/lib/analytics/project-report-analytics-service';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('project report analytics navigation state', () => {
    it('restores persisted filters and a valid page from the query string', () => {
        expect(
            projectReportStateFromSearch(
                '?view=project-reports&report_type=terminal-report&publication_year=2026&page=3',
            ),
        ).toEqual({
            filters: {
                report_type: 'terminal-report',
                publication_year: '2026',
            },
            page: 3,
        });
    });

    it('builds an analytics URL without empty or all-value filters', () => {
        expect(
            projectReportAnalyticsPath(
                '/admin/analytics',
                {
                    agency_id: '7',
                    workflow_status: 'all',
                    funding_source: '',
                },
                2,
            ),
        ).toBe('/admin/analytics?agency_id=7&view=project-reports&page=2');
    });

    it('carries the analytics state through the detail URL', () => {
        expect(
            projectReportDetailPath(
                '/admin/analytics/project-reports/42',
                '/admin/analytics?report_type=terminal-report&view=project-reports&page=2',
            ),
        ).toBe(
            '/admin/analytics/project-reports/42?return_to=%2Fadmin%2Fanalytics%3Freport_type%3Dterminal-report%26view%3Dproject-reports%26page%3D2',
        );
    });

    it('accepts only same-origin returns to the expected analytics page', () => {
        vi.stubGlobal('window', {
            location: {
                origin: 'https://rikms.test',
                search: '?return_to=%2Fagency%2Fanalytics%3Fview%3Dproject-reports%26page%3D4',
            },
        });

        expect(projectReportReturnPath('/agency/analytics')).toBe(
            '/agency/analytics?view=project-reports&page=4',
        );

        vi.stubGlobal('window', {
            location: {
                origin: 'https://rikms.test',
                search: '?return_to=https%3A%2F%2Fmalicious.example%2Fagency%2Fanalytics',
            },
        });

        expect(projectReportReturnPath('/agency/analytics')).toBe(
            '/agency/analytics?view=project-reports',
        );
    });
});
