import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DraftSaveFeedback } from '@/components/upload/reports/ReportReviewStep';
import UploadNavigation from '@/components/upload/wizard/UploadNavigation';

type TestElement = ReactElement<{
    children?: ReactNode | ReactNode[];
    onClick?: () => void;
}>;

function navigation(
    overrides: {
        draftStatus?:
            | 'idle'
            | 'loading'
            | 'unsaved'
            | 'saving'
            | 'saved'
            | 'error';
        draftError?: string | null;
        onSaveDraft?: () => void;
    } = {},
) {
    return UploadNavigation({
        currentStepNumber: 4,
        totalSteps: 9,
        canGoBack: true,
        canGoNext: true,
        draftSavedAt: null,
        draftStatus: overrides.draftStatus ?? 'unsaved',
        draftError: overrides.draftError ?? null,
        onBack: vi.fn(),
        onNext: vi.fn(),
        onSaveDraft: overrides.onSaveDraft ?? vi.fn(),
    });
}

describe('draft save feedback', () => {
    it('connects the Save Draft button to its click handler', () => {
        const onSaveDraft = vi.fn();
        const tree = navigation({ onSaveDraft });
        const rootChildren = tree.props.children as ReactNode[];
        const controls = rootChildren[1] as TestElement;
        const controlChildren = controls.props.children as ReactNode[];
        const saveButton = controlChildren[1] as TestElement;

        saveButton.props.onClick?.();

        expect(onSaveDraft).toHaveBeenCalledOnce();
    });

    it('renders the original API error instead of a generic failure', () => {
        const markup = renderToStaticMarkup(
            navigation({
                draftStatus: 'error',
                draftError: 'The draft has changed since it was loaded.',
            }),
        );

        expect(markup).toContain('role="alert"');
        expect(markup).toContain('The draft has changed since it was loaded.');
    });

    it('renders persistent review-step success and error feedback', () => {
        const success = renderToStaticMarkup(
            DraftSaveFeedback({
                feedback: {
                    tone: 'success',
                    message: 'Draft saved successfully at 4:30 PM.',
                },
            }),
        );
        const error = renderToStaticMarkup(
            DraftSaveFeedback({
                feedback: {
                    tone: 'error',
                    message: 'The reporting year is invalid.',
                },
            }),
        );

        expect(success).toContain('role="status"');
        expect(success).toContain('Draft saved successfully at 4:30 PM.');
        expect(error).toContain('role="alert"');
        expect(error).toContain('The reporting year is invalid.');
    });
});
