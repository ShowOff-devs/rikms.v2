import { describe, expect, it } from 'vitest';
import { editPageKeyForDocumentType } from '@/components/repository/edit/EditDocumentPage';
import { resolveRepositoryDocumentType } from '@/lib/repository/repository-service';

describe('edit document type routing', () => {
    it('routes each repository document type to its dedicated page', () => {
        expect(editPageKeyForDocumentType('research-study')).toBe(
            'research-study',
        );
        expect(editPageKeyForDocumentType('terminal-report')).toBe(
            'terminal-report',
        );
        expect(editPageKeyForDocumentType('project-accomplishment')).toBe(
            'project-accomplishment',
        );
    });

    it('prefers the canonical API document type over file and category labels', () => {
        expect(
            resolveRepositoryDocumentType({
                documentType: 'terminal-report',
                fileType: 'research_document',
                category: 'Research Study',
            }),
        ).toBe('terminal-report');

        expect(
            resolveRepositoryDocumentType({
                documentType: 'project-accomplishment',
                fileType: 'terminal-report',
                category: 'Terminal Report',
            }),
        ).toBe('project-accomplishment');
    });
});
