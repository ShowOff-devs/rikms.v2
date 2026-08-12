<?php

namespace App\Services\Reports;

use App\Models\Research;
use Illuminate\Validation\ValidationException;

class TerminalReportSubmissionValidator
{
    public const OFFICIAL_CALCULATED_TOLERANCE = 5.0;

    public function validate(Research $research): void
    {
        if (! str_contains(mb_strtolower((string) $research->category), 'terminal report')) {
            return;
        }

        $research->loadMissing(['reportDetail', 'performanceItems', 'reportHighlights.files', 'files']);
        $detail = $research->reportDetail;
        $errors = [];

        $this->required($errors, 'sections.details.projectStartDate', $detail?->project_start_date, 'Project start date is required.');
        $this->required($errors, 'sections.details.projectEndDate', $detail?->project_end_date, 'Project end date is required.');

        if ($detail?->project_start_date && $detail?->project_end_date && $detail->project_end_date->lt($detail->project_start_date)) {
            $errors['sections.details.projectEndDate'][] = 'Project end date must be on or after the start date.';
        }

        $currentYear = (int) now()->year;
        $year = $research->publication_year;

        if ($year === null || $year < 1900 || $year > $currentYear + 1) {
            $errors['sections.details.reportingYear'][] = 'Reporting year must be between 1900 and '.($currentYear + 1).'.';
        }

        $this->required($errors, 'sections.performance.physicalAccomplishmentPercent', $detail?->physical_accomplishment_percent, 'Official overall physical accomplishment is required.');

        foreach ([
            'allotted_budget' => 'allocatedBudget',
            'released_amount' => 'releasedAmount',
            'obligated_amount' => 'obligatedAmount',
            'utilized_amount' => 'usedBudget',
        ] as $databaseField => $frontendField) {
            $this->required(
                $errors,
                'sections.financials.'.$frontendField,
                $detail?->{$databaseField},
                'This financial amount is required.',
            );
        }

        $this->required($errors, 'sections.financials.financialAsOfDate', $detail?->financial_as_of_date, 'Financial as-of date is required.');

        if ($detail) {
            $allotted = $this->number($detail->allotted_budget);
            $released = $this->number($detail->released_amount);
            $obligated = $this->number($detail->obligated_amount);
            $utilized = $this->number($detail->utilized_amount);

            if ($allotted !== null && $released !== null && $released > $allotted) {
                $errors['sections.financials.releasedAmount'][] = 'Released amount cannot exceed the allotted budget.';
            }

            if ($allotted !== null && $obligated !== null && $obligated > $allotted) {
                $errors['sections.financials.obligatedAmount'][] = 'Obligated amount cannot exceed the allotted budget.';
            }

            if ($allotted !== null && $utilized !== null && $utilized > $allotted) {
                $errors['sections.financials.usedBudget'][] = 'Utilized amount cannot exceed the allotted budget.';
            }

            if ($released !== null && $utilized !== null && $utilized > $released) {
                $errors['sections.financials.usedBudget'][] = 'Utilized amount cannot exceed the released amount.';
            }
        }

        if ($research->performanceItems->isEmpty()) {
            $errors['sections.performance.performanceProjects'][] = 'Add at least one performance row.';
        }

        foreach ($research->performanceItems as $index => $item) {
            $prefix = "sections.performance.performanceProjects.{$index}";
            $this->required($errors, $prefix.'.projectName', $item->project_name, 'Activity, output, or indicator is required.');
            $this->required($errors, $prefix.'.targetNumericValue', $item->target_numeric_value, 'A numeric target is required.');
            $this->required($errors, $prefix.'.actualNumericValue', $item->actual_numeric_value, 'A numeric actual value is required.');

            if ($this->number($item->target_numeric_value) !== null && $this->number($item->target_numeric_value) <= 0) {
                $errors[$prefix.'.targetNumericValue'][] = 'Target must be greater than zero.';
            }

            if ($item->accomplishment_percentage === null) {
                $errors[$prefix.'.accomplishmentPercentage'][] = 'Target and actual values must be compatible and calculable.';
            }
        }

        $this->required($errors, 'sections.pap-classification.papCategories', $detail?->pap_categories, 'Select at least one PAP category.');
        $this->required($errors, 'sections.pap-classification.papDescription', $detail?->pap_description, 'PAP description is required.');
        $this->required($errors, 'sections.pap-classification.beneficiarySectors', $detail?->beneficiary_sectors, 'Select at least one beneficiary sector.');

        if ($research->reportHighlights->isEmpty()) {
            $errors['sections.highlights.highlightTitle'][] = 'At least one report highlight is required.';
        }

        foreach ($research->reportHighlights as $index => $highlight) {
            $this->required($errors, "sections.highlights.reportHighlights.{$index}.title", $highlight->title, 'Highlight title is required.');

            if (mb_strlen(trim((string) $highlight->description)) < 40) {
                $errors["sections.highlights.reportHighlights.{$index}.description"][] = 'Highlight description must be at least 40 characters.';
            }
        }

        $this->required($errors, 'sections.sdg-tagging.selectedSDGs', $research->sdgs, 'Select at least one SDG.');

        $hasMainDocument = $research->files->contains(fn ($file): bool => $file->file_type === 'terminal-report'
            && $file->status === 'active'
            && $file->archived_at === null);

        if (! $hasMainDocument) {
            $errors['sections.details.uploadedFile'][] = 'A scanned and accepted terminal-report PDF is required.';
        }

        $calculated = $research->performanceItems
            ->pluck('accomplishment_percentage')
            ->filter(fn (mixed $value): bool => $value !== null && $value !== '')
            ->map(fn (mixed $value): float => (float) $value);
        $calculatedAverage = $calculated->isEmpty() ? null : round($calculated->avg(), 2);
        $official = $this->number($detail?->physical_accomplishment_percent);

        if ($official !== null
            && $calculatedAverage !== null
            && abs($official - $calculatedAverage) > self::OFFICIAL_CALCULATED_TOLERANCE
            && trim((string) $detail?->performance_remarks) === '') {
            $errors['sections.performance.performanceRemarks'][] = 'Explain the difference between the official and row-calculated accomplishment values.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * @param  array<string, list<string>>  $errors
     */
    private function required(array &$errors, string $key, mixed $value, string $message): void
    {
        $missing = $value === null
            || (is_string($value) && trim($value) === '')
            || (is_array($value) && $value === []);

        if ($missing) {
            $errors[$key][] = $message;
        }
    }

    private function number(mixed $value): ?float
    {
        return $value === null || $value === '' || ! is_numeric($value) ? null : (float) $value;
    }
}
