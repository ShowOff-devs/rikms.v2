import { describe, expect, it } from 'vitest';
import {
    browserRecoveryUserId,
    mergeReportRecoveryStepData,
    migrateLegacyTerminalReportRecovery,
    parseReportRecovery,
    reportRecoveryConflictsWithServer,
    reportRecoveryKey,
    serializeReportRecovery,
    shouldPersistReportRecovery,
} from '@/lib/upload/draft-recovery';
import { createInitialReportWorkflowData } from '@/lib/upload/report-workflow';

const terminalScope = {
    agencyId: 'agency-1',
    userId: '41',
    documentType: 'terminal-report' as const,
    draftId: '12',
};

describe('report browser recovery', () => {
    it('isolates recovery by agency, user, document type, and draft id', () => {
        const baseKey = reportRecoveryKey(terminalScope);

        expect(
            reportRecoveryKey({ ...terminalScope, agencyId: 'agency-2' }),
        ).not.toBe(baseKey);
        expect(reportRecoveryKey({ ...terminalScope, userId: '42' })).not.toBe(
            baseKey,
        );
        expect(
            reportRecoveryKey({
                ...terminalScope,
                documentType: 'project-accomplishment',
            }),
        ).not.toBe(baseKey);
        expect(reportRecoveryKey({ ...terminalScope, draftId: '13' })).not.toBe(
            baseKey,
        );
    });

    it('keeps raw email addresses out of fallback user identifiers', () => {
        const userId = browserRecoveryUserId('Agency.User@Example.test');

        expect(userId).toMatch(/^legacy-/u);
        expect(userId).not.toContain('agency.user@example.test');
    });

    it('migrates legacy Terminal Report recovery into the isolated sanitized format', () => {
        const migrated = migrateLegacyTerminalReportRecovery(
            JSON.stringify({
                activeStepId: 'details',
                stepData: {
                    details: {
                        reportTitle: 'Legacy title',
                        uploadedFileName: 'legacy-sensitive.pdf',
                    },
                },
            }),
            terminalScope,
        );
        const snapshot = parseReportRecovery(migrated, terminalScope);

        expect(
            (snapshot.stepData.details as { reportTitle: string }).reportTitle,
        ).toBe('Legacy title');
        expect(migrated).not.toContain('legacy-sensitive.pdf');
    });

    it('omits PDF objects, file metadata, server ownership, and extracted document content', () => {
        const workflow = createInitialReportWorkflowData('terminal-report');
        workflow.details.reportTitle = 'Recovered title';
        workflow.details.uploadedFileName = 'confidential-report.pdf';
        workflow.details.uploadedFileId = '99';
        workflow.details.agency = 'Server Agency';
        workflow.details.serverDraftVersion = 4;
        workflow.aiMetadata.extractedMetadata.abstract =
            'Sensitive extracted document content';
        workflow.highlights.supportingFiles = [
            {
                id: '8',
                name: 'confidential-evidence.pdf',
                size: 2048,
                type: 'application/pdf',
            },
        ];
        const serialized = serializeReportRecovery(
            terminalScope,
            {
                activeStepId: 'details',
                stepData: {
                    details: workflow.details,
                    'ai-metadata': workflow.aiMetadata,
                    highlights: workflow.highlights,
                },
            },
            { draftVersion: 4, updatedAt: '2026-11-17T01:00:00Z' },
        );

        expect(serialized).toContain('Recovered title');
        expect(serialized).not.toContain('confidential-report.pdf');
        expect(serialized).not.toContain('confidential-evidence.pdf');
        expect(serialized).not.toContain(
            'Sensitive extracted document content',
        );
        expect(serialized).not.toContain('Server Agency');
    });

    it('detects a browser recovery based on an older server draft', () => {
        const serialized = serializeReportRecovery(
            terminalScope,
            { activeStepId: 'details', stepData: {} },
            { draftVersion: 3, updatedAt: '2026-11-17T01:00:00Z' },
        );
        const snapshot = parseReportRecovery(serialized, terminalScope);

        expect(
            reportRecoveryConflictsWithServer(snapshot, {
                draftVersion: 4,
                updatedAt: '2026-11-17T02:00:00Z',
            }),
        ).toBe(true);
        expect(
            reportRecoveryConflictsWithServer(snapshot, {
                draftVersion: 3,
                updatedAt: '2026-11-17T01:00:00Z',
            }),
        ).toBe(false);
    });

    it('restores local fields without replacing the latest server concurrency and file state', () => {
        const server = createInitialReportWorkflowData(
            'project-accomplishment',
        );
        server.details.researchId = '12';
        server.details.serverDraftVersion = 5;
        server.details.serverUpdatedAt = '2026-11-17T03:00:00Z';
        server.details.uploadedFileId = '77';
        server.details.uploadedFileName = 'server-par.pdf';
        server.details.reportTitle = 'Server title';

        const merged = mergeReportRecoveryStepData(
            { details: server.details },
            { details: { reportTitle: 'Recovered local title' } },
        );
        const details = merged.details as typeof server.details;

        expect(details.reportTitle).toBe('Recovered local title');
        expect(details.researchId).toBe('12');
        expect(details.serverDraftVersion).toBe(5);
        expect(details.serverUpdatedAt).toBe('2026-11-17T03:00:00Z');
        expect(details.uploadedFileName).toBe('server-par.pdf');
    });

    it('preserves recovery for both unsaved edits and failed saves', () => {
        expect(shouldPersistReportRecovery('unsaved')).toBe(true);
        expect(shouldPersistReportRecovery('error')).toBe(true);
        expect(shouldPersistReportRecovery('saving')).toBe(false);
        expect(shouldPersistReportRecovery('saved')).toBe(false);
    });
});
