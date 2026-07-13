<?php

namespace App\Support;

class CsvExport
{
    /**
     * @param  array<int, mixed>  $values
     * @return array<int, mixed>
     */
    public static function row(array $values): array
    {
        return array_map(self::cell(...), $values);
    }

    public static function cell(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        if ($value === '') {
            return $value;
        }

        return preg_match('/^[=\+\-@\t\r]/', $value) === 1
            ? "'".$value
            : $value;
    }
}
