<?php

$environment = env('APP_ENV', 'production');
$defaultCspMode = match ($environment) {
    'local', 'testing' => 'off',
    'pilot', 'staging' => 'report-only',
    default => 'enforce',
};

return [
    'csp' => [
        'mode' => env('CSP_MODE', $defaultCspMode),
        'production_validated' => filter_var(env('CSP_PRODUCTION_VALIDATED', false), FILTER_VALIDATE_BOOL),
        'report_uri' => env('CSP_REPORT_URI'),
        'collector' => [
            'enabled' => filter_var(env('CSP_REPORT_COLLECTOR_ENABLED', true), FILTER_VALIDATE_BOOL),
            'max_payload_bytes' => (int) env('CSP_REPORT_MAX_PAYLOAD_BYTES', 65536),
            'max_reports_per_request' => (int) env('CSP_REPORT_MAX_REPORTS_PER_REQUEST', 20),
            'rate_limit_per_minute' => (int) env('CSP_REPORT_LIMIT_PER_MINUTE', 120),
            'retention_days' => (int) env('CSP_REPORT_RETENTION_DAYS', 30),
        ],
        'directives' => [
            'default-src' => ["'self'"],
            'base-uri' => ["'self'"],
            'object-src' => ["'none'"],
            'frame-ancestors' => ["'none'"],
            'form-action' => ["'self'"],
            'img-src' => ["'self'", 'data:', 'blob:'],
            'font-src' => ["'self'", 'data:', 'https://fonts.bunny.net'],
            'style-src' => ["'self'"],
            'style-src-elem' => ["'self'", 'https://fonts.bunny.net'],
            'style-src-attr' => ["'unsafe-inline'"],
            'script-src' => ["'self'", 'https://challenges.cloudflare.com'],
            'connect-src' => ["'self'", 'https://challenges.cloudflare.com'],
            'frame-src' => ['https://challenges.cloudflare.com'],
            'worker-src' => ["'self'", 'blob:'],
            'manifest-src' => ["'self'"],
        ],
    ],
    'hsts' => [
        'value' => 'max-age=31536000; includeSubDomains',
    ],
    'referrer_policy' => 'strict-origin-when-cross-origin',
    'frame_options' => 'DENY',
    'permissions_policy' => 'camera=(), microphone=(), geolocation=()',
];
