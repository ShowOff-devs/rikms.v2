import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import UploadValidationSummary from '@/components/upload/shared/UploadValidationSummary';
import { createReportDetailsData } from '@/lib/upload/report-workflow';
import { reportStepSchemas } from '@/lib/upload/validation';

describe('report validation usability', () => {
    it('uses a friendly agency validation message instead of Zod internals', () => {
        const result = reportStepSchemas.details.safeParse(
            createReportDetailsData(),
        );

        expect(result.success).toBe(false);

        if (result.success) {
            return;
        }

        const agencyIssue = result.error.issues.find(
            (issue) => issue.path[0] === 'agency',
        );

        expect(agencyIssue?.message).toBe(
            'Agency context is unavailable. Contact an administrator before continuing.',
        );
        expect(agencyIssue?.message).not.toContain('Too small');
    });

    it('keeps the validation summary focusable and announced', () => {
        const markup = renderToStaticMarkup(
            <UploadValidationSummary
                errors={{
                    projectStartDate: {
                        type: 'custom',
                        message: 'Project start date is required.',
                    },
                }}
            />,
        );

        expect(markup).toContain('role="alert"');
        expect(markup).toContain('aria-live="assertive"');
        expect(markup).toContain('tabindex="-1"');
        expect(markup).toContain('Project start date is required.');
    });

    it('accepts a persisted PDF when the browser File object is unavailable', () => {
        const details = {
            ...createReportDetailsData(),
            uploadedFile: undefined,
            uploadedFileId: '42',
            uploadedFileName: 'project-accomplishment.pdf',
            uploadedFileType: 'application/pdf',
            uploadedFileSize: 1024,
            uploadStatus: 'uploaded' as const,
            projectStartDate: '2026-01-01',
            projectEndDate: '2026-12-31',
            reportingPeriod: 'Annual',
            reportingYear: '2026',
            agency: 'DOST XI',
        };

        expect(reportStepSchemas.details.safeParse(details).success).toBe(true);
    });

    it('uses a friendly message for a malformed browser file value', () => {
        const details = {
            ...createReportDetailsData(),
            uploadedFile: 'invalid-browser-file',
        };
        const result = reportStepSchemas.details.safeParse(details);

        expect(result.success).toBe(false);

        if (result.success) {
            return;
        }

        expect(
            result.error.issues.find(
                (issue) => issue.path[0] === 'uploadedFile',
            )?.message,
        ).toBe('Select or re-select the report PDF before continuing.');
    });
});
