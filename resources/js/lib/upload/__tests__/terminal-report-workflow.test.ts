import { describe, expect, it } from 'vitest';
import {
    parseTerminalReportRecovery,
    serializeTerminalReportRecovery,
    terminalReportRecoveryKey,
} from '@/lib/upload/draft-recovery';
import {
    calculatePerformanceProject,
    createInitialReportWorkflowData,
    createPerformanceProject,
    reportAccomplishmentSummary,
} from '@/lib/upload/report-workflow';
import {
    hydrateReportWorkflowFromRecord,
    mapReportWorkflowToResearchPayload,
    reportHighlightFileError,
} from '@/lib/upload/services/report-upload-service';
import { reportStepSchemas } from '@/lib/upload/validation';

describe('terminal report workflow', () => {
    it('uses dynamic neutral defaults without false AI provenance', () => {
        const data = createInitialReportWorkflowData('terminal-report');

        expect(data.details.reportingYear).toBe(
            String(new Date().getFullYear()),
        );
        expect(data.details.agency).toBe('');
        expect(data.papClassification.aiSuggestedPAPCategories).toEqual([]);
        expect(data.sdgTagging.selectedSDGs).toEqual([]);
        expect(data.sdgTagging.aiSuggestedSDGs).toEqual([]);
        expect(data.sdgTagging.aiSuggestionsApplied).toBe(false);
    });

    it('preserves overachievement and clears stale derived values', () => {
        const row = createPerformanceProject('Prototype rollout');
        const overachieved = calculatePerformanceProject({
            ...row,
            targetNumericValue: 10,
            actualNumericValue: 12,
            targetValue: '10',
            actualValue: '12',
            unit: 'prototypes',
        });
        const invalidated = calculatePerformanceProject({
            ...overachieved,
            actualNumericValue: null,
            actualValue: null,
        });

        expect(overachieved.accomplishmentPercentage).toBe(120);
        expect(overachieved.projectStatus).toBe('completed');
        expect(invalidated.accomplishmentPercentage).toBeNull();
        expect(invalidated.projectStatus).toBe('not-reported');
    });

    it('uses official accomplishment first and excludes missing rows from the fallback average', () => {
        const first = {
            ...createPerformanceProject('First'),
            accomplishmentPercentage: 120,
        };
        const missing = createPerformanceProject('Missing');
        const calculated = reportAccomplishmentSummary({
            performanceProjects: [first, missing],
            physicalAccomplishmentPercent: null,
            performanceRemarks: '',
        });
        const official = reportAccomplishmentSummary({
            performanceProjects: [first, missing],
            physicalAccomplishmentPercent: 95,
            performanceRemarks: '',
        });

        expect(calculated.displayPercentage).toBe(120);
        expect(calculated.calculatedPercentage).toBe(120);
        expect(official.displayPercentage).toBe(95);
        expect(official.source).toBe('official');
        expect(official.difference).toBe(25);
    });

    it('maps every formerly discarded section into the API payload', () => {
        const data = createInitialReportWorkflowData('terminal-report');
        data.details.reportTitle = 'Terminal report';
        data.details.lastWizardStep = 'highlights';
        data.papClassification.papCategories = ['Research and Development'];
        data.papClassification.papDescription = 'Program description';
        data.papClassification.beneficiarySectors = ['government'];
        data.performance.performanceRemarks = 'Performance context';
        data.performance.performanceProjects = [
            calculatePerformanceProject({
                ...createPerformanceProject('Output'),
                targetValue: '1,000',
                actualValue: '1,200',
                targetNumericValue: 1000,
                actualNumericValue: 1200,
                unit: 'outputs',
            }),
        ];
        data.highlights.highlightId = '12';
        data.highlights.highlightTitle = 'Key result';
        data.highlights.highlightDescription =
            'A sufficiently detailed highlight description for persistence.';
        data.highlights.featuredHighlight = true;

        const payload = mapReportWorkflowToResearchPayload(data);

        expect(payload.report_details?.pap_categories).toEqual([
            'Research and Development',
        ]);
        expect(payload.report_details?.beneficiary_sectors).toEqual([
            'government',
        ]);
        expect(payload.report_details?.performance_remarks).toBe(
            'Performance context',
        );
        expect(payload.performance_items?.[0].target_numeric_value).toBe(1000);
        expect(payload.performance_items?.[0].accomplishment_percentage).toBe(
            120,
        );
        expect(payload.report_highlights?.[0]).toMatchObject({
            id: 12,
            title: 'Key result',
            is_featured: true,
        });
    });

    it('hydrates all persisted sections, attachments, agency, and saved step', () => {
        const data = hydrateReportWorkflowFromRecord(
            {
                id: 7,
                title: 'Hydrated report',
                abstract: 'Hydrated abstract',
                authors: ['Author'],
                publication_year: 2025,
                category: 'Terminal Report',
                sdgs: ['SDG 9'],
                keywords: ['innovation'],
                public_metadata_fields: ['title', 'abstract'],
                public_metadata: [],
                status: 'draft',
                updated_at: '2026-08-05T10:00:00.000000Z',
                agency: { short_name: 'DOST XI' },
                report_detail: {
                    reporting_period: 'Final',
                    project_start_date: '2025-01-01',
                    project_end_date: '2025-12-31',
                    pap_categories: ['Research and Development'],
                    pap_description: 'PAP description',
                    beneficiary_sectors: ['government'],
                    performance_remarks: 'Remarks',
                    last_wizard_step: 'highlights',
                },
                performance_items: [
                    {
                        id: 4,
                        project_name: 'Output',
                        target_value: '10',
                        actual_value: '12',
                        target_numeric_value: '10.0000',
                        actual_numeric_value: '12.0000',
                        unit: 'outputs',
                        accomplishment_percentage: '120.00',
                        project_status: 'completed',
                    },
                ],
                report_highlights: [
                    {
                        id: 3,
                        title: 'Highlight',
                        description:
                            'A persisted highlight description with sufficient detail.',
                        is_featured: true,
                        files: [
                            {
                                id: 8,
                                research_id: 7,
                                report_highlight_id: 3,
                                original_name: 'evidence.pdf',
                                mime_type: 'application/pdf',
                                size_bytes: 1024,
                                file_type: 'report-highlight-supporting',
                                status: 'active',
                            },
                        ],
                    },
                ],
                files: [
                    {
                        id: 2,
                        research_id: 7,
                        original_name: 'terminal.pdf',
                        mime_type: 'application/pdf',
                        size_bytes: 2048,
                        file_type: 'terminal-report',
                        status: 'active',
                    },
                ],
            },
            'Authenticated Agency',
        );

        expect(data.details.researchId).toBe('7');
        expect(data.details.uploadStatus).toBe('uploaded');
        expect(data.details.agency).toBe('Authenticated Agency');
        expect(data.details.lastWizardStep).toBe('highlights');
        expect(data.papClassification.beneficiarySectors).toEqual([
            'government',
        ]);
        expect(data.performance.performanceProjects[0]).toMatchObject({
            targetNumericValue: 10,
            accomplishmentPercentage: 120,
        });
        expect(data.highlights.supportingFiles[0].name).toBe('evidence.pdf');
    });

    it('serializes scoped non-file recovery state', () => {
        const data = createInitialReportWorkflowData('terminal-report');
        data.details.reportTitle = 'Recovered title';
        const serialized = serializeTerminalReportRecovery({
            activeStepId: 'performance',
            stepData: {
                details: data.details,
                performance: data.performance,
            },
        });
        const recovered = parseTerminalReportRecovery(serialized);

        expect(
            terminalReportRecoveryKey('agency-1:user@example.test'),
        ).not.toBe(terminalReportRecoveryKey('agency-2:user@example.test'));
        expect(recovered.activeStepId).toBe('performance');
        expect(
            (recovered.stepData.details as typeof data.details).reportTitle,
        ).toBe('Recovered title');
    });

    it('rejects invalid years and exposes missing strict performance fields', () => {
        const data = createInitialReportWorkflowData('terminal-report');
        data.details.uploadedFileName = 'report.pdf';
        data.details.uploadStatus = 'uploaded';
        data.details.reportingPeriod = 'Final';
        data.details.reportingYear = 'invalid';
        data.details.projectStartDate = '2026-01-01';
        data.details.projectEndDate = '2026-12-31';
        data.performance.performanceProjects = [
            createPerformanceProject('Output'),
        ];

        expect(reportStepSchemas.details.safeParse(data.details).success).toBe(
            false,
        );
        expect(
            reportStepSchemas.performance.safeParse(data.performance).success,
        ).toBe(false);
    });

    it('validates supporting file type size and count before upload', () => {
        expect(
            reportHighlightFileError(
                {
                    name: 'script.exe',
                    size: 10,
                    type: 'application/octet-stream',
                },
                0,
            ),
        ).toContain('PDF, PNG, or JPEG');
        expect(
            reportHighlightFileError(
                { name: 'proof.pdf', size: 1024, type: 'application/pdf' },
                0,
            ),
        ).toBeNull();
        expect(
            reportHighlightFileError(
                { name: 'proof.pdf', size: 1024, type: 'application/pdf' },
                5,
            ),
        ).toContain('at most 5');
    });
});
