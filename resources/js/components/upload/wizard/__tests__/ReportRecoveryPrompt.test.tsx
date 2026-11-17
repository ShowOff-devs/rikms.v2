import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ReportRecoveryPrompt from '@/components/upload/wizard/ReportRecoveryPrompt';

describe('ReportRecoveryPrompt', () => {
    it('renders PAR-specific Restore and Discard choices for a server conflict', () => {
        const markup = renderToStaticMarkup(
            <ReportRecoveryPrompt
                documentLabel="Project Accomplishment Report"
                conflict
                onRestore={vi.fn()}
                onDiscard={vi.fn()}
            />,
        );

        expect(markup).toContain(
            'Restore unsaved Project Accomplishment Report changes?',
        );
        expect(markup).toContain('older server draft');
        expect(markup).toContain('Restore');
        expect(markup).toContain('Discard');
    });

    it('renders Terminal Report-specific non-conflict recovery copy', () => {
        const markup = renderToStaticMarkup(
            <ReportRecoveryPrompt
                documentLabel="Terminal Report"
                conflict={false}
                onRestore={vi.fn()}
                onDiscard={vi.fn()}
            />,
        );

        expect(markup).toContain('Restore unsaved Terminal Report changes?');
        expect(markup).toContain('Unsaved changes for this draft');
    });
});
