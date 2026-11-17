import { describe, expect, it } from 'vitest';
import { projectAccomplishmentUploadConfig } from '@/config/upload/projectAccomplishmentUploadConfig';
import { terminalReportUploadConfig } from '@/config/upload/terminalReportUploadConfig';
import { buildUploadDraftPath } from '@/lib/upload/draft-route';

describe('document draft route generation', () => {
    it('generates the Terminal Report draft route', () => {
        expect(buildUploadDraftPath(terminalReportUploadConfig, 42)).toBe(
            '/agency/upload/terminal-report/42',
        );
    });

    it('generates the Project Accomplishment Report draft route', () => {
        expect(
            buildUploadDraftPath(projectAccomplishmentUploadConfig, '73'),
        ).toBe('/agency/upload/project-accomplishment/73');
    });

    it.each([undefined, null, '', '  ', 0, -1, 'abc', '12/other'])(
        'rejects invalid draft id %s',
        (draftId) => {
            expect(
                buildUploadDraftPath(terminalReportUploadConfig, draftId),
            ).toBeNull();
        },
    );

    it('does not generate a path without document route configuration', () => {
        expect(buildUploadDraftPath({ type: 'research' }, 42)).toBeNull();
    });

    it('rejects a route configuration for a different document type', () => {
        expect(
            buildUploadDraftPath(
                {
                    type: 'terminal-report',
                    draftRoute: {
                        documentType: 'project-accomplishment',
                        basePath: '/agency/upload/project-accomplishment',
                    },
                },
                42,
            ),
        ).toBeNull();
    });
});
