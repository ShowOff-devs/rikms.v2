<?php

namespace App\Services\Analytics;

use App\Models\Research;

class ProjectAccomplishmentService
{
    public const THRESHOLDS = [
        'substantially_complete' => 80.0,
        'complete' => 100.0,
    ];

    /**
     * @return array<string, mixed>
     */
    public function calculate(Research $research): array
    {
        $research->loadMissing(['reportDetail', 'performanceItems']);
        $detail = $research->reportDetail;
        $items = $research->performanceItems;
        $itemPercentages = $items
            ->pluck('accomplishment_percentage')
            ->filter(fn (mixed $value): bool => $this->present($value))
            ->map(fn (mixed $value): float => (float) $value)
            ->values();
        $itemAverage = $itemPercentages->isNotEmpty()
            ? round($itemPercentages->sum() / $itemPercentages->count(), 2)
            : null;
        $official = $detail?->physical_accomplishment_percent;

        if ($this->present($official)) {
            $percentage = (float) $official;
            $source = 'report_detail';
        } elseif ($itemAverage !== null) {
            $percentage = $itemAverage;
            $source = 'performance_items_average';
        } else {
            $percentage = null;
            $source = null;
        }

        return [
            'data_status' => $percentage === null ? 'not_reported' : 'reported',
            'physical_accomplishment_percentage' => $percentage,
            'classification' => $this->classification($percentage),
            'performance_items_total' => $items->count(),
            'performance_items_with_percentage' => $itemPercentages->count(),
            'calculated_item_average' => $itemAverage,
            'official_value_source' => $source,
        ];
    }

    private function classification(?float $percentage): string
    {
        if ($percentage === null) {
            return 'not_reported';
        }

        if ($percentage == 0.0) {
            return 'not_started';
        }

        if ($percentage >= self::THRESHOLDS['complete']) {
            return 'complete';
        }

        if ($percentage >= self::THRESHOLDS['substantially_complete']) {
            return 'substantially_complete';
        }

        return 'in_progress';
    }

    private function present(mixed $value): bool
    {
        return $value !== null && (! is_string($value) || trim($value) !== '');
    }
}
