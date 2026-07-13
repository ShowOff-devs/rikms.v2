<?php

namespace App\Services\Analytics;

use App\Models\Research;

class BudgetUtilizationService
{
    public const THRESHOLDS = [
        'low' => 50.0,
        'moderate' => 80.0,
        'high' => 100.0,
    ];

    /**
     * @return array<string, mixed>
     */
    public function calculate(Research $research): array
    {
        $research->loadMissing('reportDetail');
        $detail = $research->reportDetail;

        if (! $detail || ! $this->hasAnyFinancialData($detail)) {
            return [
                'data_status' => 'not_reported',
                'allotted_budget' => null,
                'released_amount' => null,
                'obligated_amount' => null,
                'utilized_amount' => null,
                'remaining_balance' => null,
                'utilization_percentage' => null,
                'classification' => 'not_reported',
                'warnings' => [],
            ];
        }

        $remainingBalance = Decimal::subtract($detail->allotted_budget, $detail->utilized_amount);
        $utilizationPercentage = Decimal::percentage($detail->utilized_amount, $detail->allotted_budget);

        return [
            'data_status' => 'reported',
            'allotted_budget' => Decimal::normalize($detail->allotted_budget),
            'released_amount' => Decimal::normalize($detail->released_amount),
            'obligated_amount' => Decimal::normalize($detail->obligated_amount),
            'utilized_amount' => Decimal::normalize($detail->utilized_amount),
            'remaining_balance' => $remainingBalance,
            'utilization_percentage' => $utilizationPercentage,
            'classification' => $this->classification($detail->utilized_amount, $utilizationPercentage),
            'warnings' => $this->warnings($detail),
        ];
    }

    private function hasAnyFinancialData(mixed $detail): bool
    {
        return collect([
            $detail->allotted_budget,
            $detail->released_amount,
            $detail->obligated_amount,
            $detail->utilized_amount,
            $detail->financial_as_of_date,
        ])->contains(fn (mixed $value): bool => $this->present($value));
    }

    private function classification(mixed $utilizedAmount, ?float $utilizationPercentage): string
    {
        if (Decimal::normalize($utilizedAmount) === '0.00') {
            return 'not_utilized';
        }

        if ($utilizationPercentage === null) {
            return 'not_reported';
        }

        if ($utilizationPercentage > self::THRESHOLDS['high']) {
            return 'overutilized';
        }

        if ($utilizationPercentage === self::THRESHOLDS['high']) {
            return 'fully_utilized';
        }

        if ($utilizationPercentage >= self::THRESHOLDS['moderate']) {
            return 'high';
        }

        if ($utilizationPercentage >= self::THRESHOLDS['low']) {
            return 'moderate';
        }

        return 'low';
    }

    /**
     * @return list<string>
     */
    private function warnings(mixed $detail): array
    {
        $warnings = [];

        if (Decimal::compare($detail->released_amount, $detail->allotted_budget) === 1) {
            $warnings[] = 'released_exceeds_allotted';
        }

        if (Decimal::compare($detail->obligated_amount, $detail->allotted_budget) === 1) {
            $warnings[] = 'obligated_exceeds_allotted';
        }

        if (Decimal::compare($detail->utilized_amount, $detail->allotted_budget) === 1) {
            $warnings[] = 'utilized_exceeds_allotted';
        }

        if (Decimal::compare($detail->utilized_amount, $detail->released_amount) === 1) {
            $warnings[] = 'utilized_exceeds_released';
        }

        if (Decimal::compare($detail->obligated_amount, $detail->released_amount) === 1) {
            $warnings[] = 'obligated_exceeds_released';
        }

        if (! $this->present($detail->financial_as_of_date)) {
            $warnings[] = 'missing_financial_as_of_date';
        }

        return $warnings;
    }

    private function present(mixed $value): bool
    {
        return $value !== null && (! is_string($value) || trim($value) !== '');
    }
}
