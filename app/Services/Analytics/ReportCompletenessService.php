<?php

namespace App\Services\Analytics;

use App\Models\Research;

class ReportCompletenessService
{
    public function __construct(private readonly ReportTypeResolver $reportTypeResolver = new ReportTypeResolver) {}

    /**
     * @return array<string, mixed>
     */
    public function calculate(Research $research): array
    {
        $research->loadMissing(['reportDetail', 'performanceItems', 'files']);
        $reportType = $this->reportTypeResolver->resolve($research);

        if ($reportType === ReportTypeResolver::NOT_APPLICABLE) {
            return [
                'data_status' => 'not_applicable',
                'percentage' => null,
                'completed_sections' => 0,
                'total_sections' => 0,
                'is_complete' => false,
                'classification' => 'not_applicable',
                'sections' => [],
            ];
        }

        $sections = [
            'document' => $this->documentSection($research, $reportType),
            'project_details' => $this->fieldsSection($research->reportDetail, [
                'reporting_period',
                'project_start_date',
                'project_end_date',
            ]),
            'metadata' => $this->researchFieldsSection($research, [
                'title',
                'abstract',
                'public_metadata_fields',
            ]),
            'performance' => $this->performanceSection($research),
            'financials' => $this->fieldsSection($research->reportDetail, [
                'allotted_budget',
                'released_amount',
                'obligated_amount',
                'utilized_amount',
                'financial_as_of_date',
            ]),
            'sdg_classification' => $this->researchFieldsSection($research, [
                'sdgs',
            ]),
        ];

        $completedSections = collect($sections)->filter(fn (array $section): bool => $section['complete'])->count();
        $totalSections = count($sections);
        $percentage = $totalSections > 0 ? round(($completedSections / $totalSections) * 100, 2) : null;
        $isComplete = $completedSections === $totalSections;

        return [
            'data_status' => 'reported',
            'percentage' => $percentage,
            'completed_sections' => $completedSections,
            'total_sections' => $totalSections,
            'is_complete' => $isComplete,
            'classification' => $this->classification($completedSections, $isComplete),
            'sections' => $sections,
        ];
    }

    /**
     * @return array{complete: bool, missing_fields: list<string>}
     */
    private function documentSection(Research $research, string $reportType): array
    {
        $missing = [];

        if (! $this->present($research->category)) {
            $missing[] = 'category';
        }

        $hasDocument = $this->present($research->document_path)
            || $research->files->contains(fn ($file): bool => $file->file_type === $reportType);

        if (! $hasDocument) {
            $missing[] = 'document';
        }

        return [
            'complete' => $missing === [],
            'missing_fields' => $missing,
        ];
    }

    /**
     * @param  list<string>  $fields
     * @return array{complete: bool, missing_fields: list<string>}
     */
    private function fieldsSection(mixed $model, array $fields): array
    {
        if (! $model) {
            return [
                'complete' => false,
                'missing_fields' => $fields,
            ];
        }

        $missing = collect($fields)
            ->filter(fn (string $field): bool => ! $this->present($model->{$field}))
            ->values()
            ->all();

        return [
            'complete' => $missing === [],
            'missing_fields' => $missing,
        ];
    }

    /**
     * @param  list<string>  $fields
     * @return array{complete: bool, missing_fields: list<string>}
     */
    private function researchFieldsSection(Research $research, array $fields): array
    {
        $missing = collect($fields)
            ->filter(fn (string $field): bool => ! $this->present($research->{$field}))
            ->values()
            ->all();

        return [
            'complete' => $missing === [],
            'missing_fields' => $missing,
        ];
    }

    /**
     * @return array{complete: bool, missing_fields: list<string>}
     */
    private function performanceSection(Research $research): array
    {
        $missing = [];

        if ($research->performanceItems->isEmpty()) {
            $missing[] = 'performance_items';
        }

        return [
            'complete' => $missing === [],
            'missing_fields' => $missing,
        ];
    }

    private function present(mixed $value): bool
    {
        if ($value === null) {
            return false;
        }

        if (is_string($value)) {
            return trim($value) !== '';
        }

        if (is_array($value)) {
            return $value !== [];
        }

        return true;
    }

    private function classification(int $completedSections, bool $isComplete): string
    {
        if ($completedSections === 0) {
            return 'not_started';
        }

        return $isComplete ? 'complete' : 'incomplete';
    }
}
