<?php

namespace App\Services\Reports;

class PerformanceCalculationService
{
    public const STATUS_NOT_REPORTED = 'not-reported';

    public const STATUS_NOT_STARTED = 'not-started';

    public const STATUS_IN_PROGRESS = 'in-progress';

    public const STATUS_SUBSTANTIALLY_COMPLETE = 'substantially-complete';

    public const STATUS_COMPLETED = 'completed';

    public const STATUSES = [
        self::STATUS_NOT_REPORTED,
        self::STATUS_NOT_STARTED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_SUBSTANTIALLY_COMPLETE,
        self::STATUS_COMPLETED,
    ];

    /**
     * Canonicalize a draft row. Client-provided percentage and status are intentionally ignored.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    public function canonicalize(array $item): array
    {
        $target = $this->nullableNumber($item['target_numeric_value'] ?? null);
        $actual = $this->nullableNumber($item['actual_numeric_value'] ?? null);
        $unit = $this->normalizeUnit($item['unit'] ?? null);

        if ($target === null && $actual === null) {
            $parsedTarget = $this->parseLegacyValue($item['target_value'] ?? null);
            $parsedActual = $this->parseLegacyValue($item['actual_value'] ?? null);

            if ($parsedTarget !== null && $parsedActual !== null && $parsedTarget['unit'] === $parsedActual['unit']) {
                $target = $parsedTarget['value'];
                $actual = $parsedActual['value'];
                $unit = $parsedTarget['unit'];
            }
        }

        $percentage = $this->percentage($target, $actual);

        return array_merge($item, [
            'target_numeric_value' => $target,
            'actual_numeric_value' => $actual,
            'unit' => $unit,
            'accomplishment_percentage' => $percentage,
            'project_status' => $this->status($percentage),
        ]);
    }

    public function percentage(?float $target, ?float $actual): ?float
    {
        if ($target === null || $actual === null || $target <= 0 || $actual < 0) {
            return null;
        }

        return round(($actual / $target) * 100, 2);
    }

    public function status(?float $percentage): string
    {
        if ($percentage === null) {
            return self::STATUS_NOT_REPORTED;
        }

        if ($percentage <= 0) {
            return self::STATUS_NOT_STARTED;
        }

        if ($percentage >= 100) {
            return self::STATUS_COMPLETED;
        }

        if ($percentage >= 80) {
            return self::STATUS_SUBSTANTIALLY_COMPLETE;
        }

        return self::STATUS_IN_PROGRESS;
    }

    /**
     * Strictly parse legacy values such as "1,000 trainings". Ambiguous values are not reinterpreted.
     *
     * @return array{value: float, unit: string|null}|null
     */
    public function parseLegacyValue(mixed $value): ?array
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $text = trim((string) $value);

        if ($text === '' || ! preg_match('/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|[+-]?\.\d+)(?:\s+([^\d].*))?$/u', $text, $matches)) {
            return null;
        }

        $numeric = (float) str_replace(',', '', $matches[1]);

        if (! is_finite($numeric)) {
            return null;
        }

        return [
            'value' => $numeric,
            'unit' => $this->normalizeUnit($matches[2] ?? null),
        ];
    }

    private function nullableNumber(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        $number = (float) $value;

        return is_finite($number) ? $number : null;
    }

    private function normalizeUnit(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $unit = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $value) ?? ''));

        return $unit === '' ? null : $unit;
    }
}
