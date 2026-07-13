<?php

namespace App\Services\Analytics;

class Decimal
{
    public static function isReported(mixed $value): bool
    {
        return $value !== null && (! is_string($value) || trim($value) !== '');
    }

    public static function normalize(mixed $value, int $scale = 2): ?string
    {
        if (! self::isReported($value)) {
            return null;
        }

        return bcadd((string) $value, '0', $scale);
    }

    public static function subtract(mixed $left, mixed $right, int $scale = 2): ?string
    {
        $left = self::normalize($left, $scale);
        $right = self::normalize($right, $scale);

        if ($left === null || $right === null) {
            return null;
        }

        return bcsub($left, $right, $scale);
    }

    public static function add(mixed $left, mixed $right, int $scale = 2): string
    {
        $left = self::normalize($left, $scale) ?? self::normalize(0, $scale);
        $right = self::normalize($right, $scale) ?? self::normalize(0, $scale);

        return bcadd($left, $right, $scale);
    }

    public static function percentage(mixed $part, mixed $whole, int $scale = 2): ?float
    {
        $part = self::normalize($part, $scale);
        $whole = self::normalize($whole, $scale);

        if ($part === null || $whole === null || bccomp($whole, '0', $scale) === 0) {
            return null;
        }

        return (float) bcadd(bcmul(bcdiv($part, $whole, 6), '100', 6), '0', $scale);
    }

    public static function compare(mixed $left, mixed $right, int $scale = 2): ?int
    {
        $left = self::normalize($left, $scale);
        $right = self::normalize($right, $scale);

        if ($left === null || $right === null) {
            return null;
        }

        return bccomp($left, $right, $scale);
    }
}
