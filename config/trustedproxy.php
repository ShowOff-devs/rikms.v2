<?php

use Illuminate\Http\Request;

$csv = static fn (?string $value): array => array_values(array_filter(
    array_map('trim', explode(',', (string) $value)),
    static fn (string $item): bool => $item !== '',
));

$headerMap = [
    'x-forwarded-for' => Request::HEADER_X_FORWARDED_FOR,
    'x-forwarded-proto' => Request::HEADER_X_FORWARDED_PROTO,
    'x-forwarded-host' => Request::HEADER_X_FORWARDED_HOST,
    'x-forwarded-port' => Request::HEADER_X_FORWARDED_PORT,
    'x-forwarded-prefix' => Request::HEADER_X_FORWARDED_PREFIX,
];

$headers = array_reduce(
    $csv(env('TRUSTED_PROXY_HEADERS', 'x-forwarded-for,x-forwarded-proto,x-forwarded-host')),
    static fn (int $carry, string $header): int => $carry | ($headerMap[strtolower($header)] ?? 0),
    0,
);

return [
    'hosts' => array_map(
        static fn (string $host): string => '^'.preg_quote($host, '/').'$',
        $csv(env('TRUSTED_HOSTS')),
    ),
    'proxies' => $csv(env('TRUSTED_PROXIES')),
    'headers' => $headers,
];
