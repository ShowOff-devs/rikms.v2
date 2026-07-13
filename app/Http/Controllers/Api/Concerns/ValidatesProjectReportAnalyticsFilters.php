<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Services\Analytics\ProjectReportAnalyticsService;
use App\Support\Statuses;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

trait ValidatesProjectReportAnalyticsFilters
{
    /**
     * @return array<string, mixed>
     */
    private function reportAnalyticsFilters(Request $request, bool $allowAgencyFilter = false): array
    {
        $rules = [
            'report_type' => ['nullable', Rule::in(ProjectReportAnalyticsService::REPORT_TYPES)],
            'publication_year' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'reporting_period' => ['nullable', Rule::in(ProjectReportAnalyticsService::REPORTING_PERIODS)],
            'workflow_status' => ['nullable', Rule::in(Statuses::RESEARCH)],
            'completeness' => ['nullable', Rule::in(ProjectReportAnalyticsService::COMPLETENESS)],
            'budget_classification' => ['nullable', Rule::in(ProjectReportAnalyticsService::BUDGET_CLASSIFICATIONS)],
            'accomplishment_classification' => ['nullable', Rule::in(ProjectReportAnalyticsService::ACCOMPLISHMENT_CLASSIFICATIONS)],
            'funding_source' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort' => ['nullable', Rule::in(ProjectReportAnalyticsService::SORTS)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ];

        if ($allowAgencyFilter) {
            $rules['agency_id'] = ['nullable', 'integer', 'exists:agencies,id'];
        }

        $validated = $request->validate($rules);

        $validated['per_page'] ??= 15;
        $validated['sort'] ??= 'created_at';
        $validated['direction'] ??= 'desc';

        return $validated;
    }
}
