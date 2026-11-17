import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FieldErrors } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import ReportDetailsStep from '@/components/upload/reports/ReportDetailsStep';
import { projectAccomplishmentUploadConfig } from '@/config/upload/projectAccomplishmentUploadConfig';
import { createReportDetailsData } from '@/lib/upload/report-workflow';
import type { ReportDetailsData } from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

vi.mock('@/components/upload/reports/ReportStepLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/upload/upload-limits', () => ({
    uploadLimitBytes: (megabytes: number) => megabytes * 1024 * 1024,
    uploadLimitLabel: (megabytes: number) => `${megabytes} MB`,
    useEffectiveUploadLimitMb: () => 10,
}));

function renderDetails(details: ReportDetailsData, errors: FieldErrors = {}) {
    const step = projectAccomplishmentUploadConfig.steps.find(
        (item) => item.id === 'details',
    );

    if (!step) {
        throw new Error('Details step is unavailable.');
    }

    const props: UploadWizardStepProps = {
        config: projectAccomplishmentUploadConfig,
        step,
        stepIndex: 1,
        totalSteps: 9,
        state: {
            activeStepId: 'details',
            completedStepIds: ['doc-type'],
            stepData: { details },
            draftSavedAt: null,
            draftStatus: 'unsaved',
            draftError: null,
            validationErrors: {},
        },
        stepData: details,
        setStepData: vi.fn(),
        setWorkflowStepData: vi.fn(),
        goBack: vi.fn(),
        goNext: vi.fn(),
        goToStep: vi.fn(),
        saveDraft: vi.fn(),
        applyBackendErrors: vi.fn(),
        markSubmissionComplete: vi.fn(),
        errors,
    };

    return renderToStaticMarkup(<ReportDetailsStep {...props} />);
}

describe('ReportDetailsStep validation UX', () => {
    it('shows friendly inline errors and never labels an invalid agency as auto-filled', () => {
        const details = createReportDetailsData();
        const markup = renderDetails(details, {
            agency: {
                type: 'custom',
                message:
                    'Agency context is unavailable. Contact an administrator before continuing.',
            },
            projectStartDate: {
                type: 'custom',
                message: 'Project start date is required.',
            },
            reportingYear: {
                type: 'custom',
                message: 'Enter a four-digit reporting year.',
            },
        });

        expect(markup).toContain('Agency unavailable');
        expect(markup).not.toContain('Auto-filled');
        expect(markup).toContain('aria-invalid="true"');
        expect(markup).toContain('project-start-date-error');
        expect(markup).toContain('reporting-year-error');
        expect(markup).toContain('Contact an administrator');
    });

    it('shows Auto-filled only for a valid read-only agency', () => {
        const details = {
            ...createReportDetailsData(),
            agency: 'DOST XI',
        };
        const markup = renderDetails(details);

        expect(markup).toContain('aria-readonly="true"');
        expect(markup).toContain('DOST XI');
        expect(markup).toContain('Auto-filled');
    });

    it('explains PDF re-selection after browser recovery', () => {
        const details = {
            ...createReportDetailsData(),
            browserRecoveryRestored: true,
        };
        const markup = renderDetails(details);

        expect(markup).toContain('PDF files are never stored');
        expect(markup).toContain('Select the report PDF again');
    });
});
