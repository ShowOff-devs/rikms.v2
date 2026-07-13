<?php

namespace App\Services\Analytics;

use App\Models\Research;

class ReportAnalyticsAssembler
{
    public function __construct(
        private readonly ReportTypeResolver $reportTypeResolver = new ReportTypeResolver,
        private readonly ReportCompletenessService $completeness = new ReportCompletenessService,
        private readonly BudgetUtilizationService $budget = new BudgetUtilizationService,
        private readonly ProjectAccomplishmentService $accomplishment = new ProjectAccomplishmentService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function assemble(Research $research): array
    {
        $research->loadMissing(['reportDetail', 'performanceItems', 'files']);
        $reportType = $this->reportTypeResolver->resolve($research);

        if ($reportType === ReportTypeResolver::NOT_APPLICABLE) {
            return [
                'research_id' => $research->id,
                'report_type' => ReportTypeResolver::NOT_APPLICABLE,
                'workflow_status' => $research->status,
                'completeness' => $this->completeness->calculate($research),
                'budget' => ['data_status' => 'not_applicable'],
                'accomplishment' => ['data_status' => 'not_applicable'],
            ];
        }

        return [
            'research_id' => $research->id,
            'report_type' => $reportType,
            'workflow_status' => $research->status,
            'completeness' => $this->completeness->calculate($research),
            'budget' => $this->budget->calculate($research),
            'accomplishment' => $this->accomplishment->calculate($research),
        ];
    }
}
