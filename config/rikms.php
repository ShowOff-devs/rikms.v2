<?php

$safeDevelopmentEnvironment = in_array(env('APP_ENV'), ['local', 'testing'], true);

return [
    'dev_seed_accounts' => [
        'enabled' => $safeDevelopmentEnvironment
            && filter_var(env('RIKMS_ALLOW_DEV_SEED_ACCOUNTS', false), FILTER_VALIDATE_BOOL),
        'super_admin_auth_code' => $safeDevelopmentEnvironment
            ? env('RIKMS_DEV_SUPER_ADMIN_AUTH_CODE')
            : null,
    ],

    'public_access_requests' => [
        'enabled' => (bool) env('PUBLIC_ACCESS_REQUESTS_ENABLED', true),
        'limits' => [
            'per_minute' => (int) env('PUBLIC_ACCESS_REQUEST_LIMIT_PER_MINUTE', 5),
            'per_hour' => (int) env('PUBLIC_ACCESS_REQUEST_LIMIT_PER_HOUR', 20),
            'email_per_hour' => (int) env('PUBLIC_ACCESS_REQUEST_EMAIL_LIMIT_PER_HOUR', 3),
        ],
        'active_duplicate_statuses' => [
            'pending',
        ],
        'captcha' => [
            'enabled' => filter_var(env('PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED', false), FILTER_VALIDATE_BOOL),
            'frontend_enabled' => filter_var(env('VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED', false), FILTER_VALIDATE_BOOL),
            'provider' => env('CAPTCHA_PROVIDER', 'turnstile'),
            'site_key' => env('VITE_CAPTCHA_SITE_KEY'),
            'secret_key' => env('CAPTCHA_SECRET_KEY'),
            'timeout_seconds' => (float) env('CAPTCHA_VERIFY_TIMEOUT_SECONDS', 3),
            'allowed_hostnames' => array_values(array_filter(array_map(
                static fn (string $hostname): string => strtolower(rtrim(trim($hostname), '.')),
                explode(',', (string) env('CAPTCHA_ALLOWED_HOSTNAMES', '')),
            ))),
            'expected_action' => 'public_access_request',
        ],
    ],

    'security' => [
        'log_level' => env('LOG_LEVEL', 'debug'),
        'dev_seed_accounts_requested' => filter_var(env('RIKMS_ALLOW_DEV_SEED_ACCOUNTS', false), FILTER_VALIDATE_BOOL),
        'force_super_admin_mfa' => (bool) env('RIKMS_FORCE_SUPER_ADMIN_MFA', true),
        'public_api_per_minute' => (int) env('PUBLIC_API_LIMIT_PER_MINUTE', 60),
        'public_downloads_per_minute' => (int) env('PUBLIC_DOWNLOAD_LIMIT_PER_MINUTE', 20),
        'approved_access_per_minute' => (int) env('APPROVED_ACCESS_LIMIT_PER_MINUTE', 10),
    ],

    'public_cache' => [
        'list_ttl_seconds' => (int) env('PUBLIC_CACHE_LIST_TTL_SECONDS', 60),
        'summary_ttl_seconds' => (int) env('PUBLIC_CACHE_SUMMARY_TTL_SECONDS', 300),
        'agency_ttl_seconds' => (int) env('PUBLIC_CACHE_AGENCY_TTL_SECONDS', 300),
    ],

    'scheduled_notifications' => [
        'enabled' => filter_var(env('SCHEDULED_AGENCY_EMAILS_ENABLED', true), FILTER_VALIDATE_BOOL),
        'timezone' => env('SCHEDULED_AGENCY_EMAILS_TIMEZONE', 'Asia/Manila'),
        'weekly_digest' => [
            'day' => (int) env('WEEKLY_DIGEST_DAY', 1),
            'time' => env('WEEKLY_DIGEST_TIME', '08:00'),
        ],
        'monthly_analytics' => [
            'day' => (int) env('MONTHLY_ANALYTICS_DAY', 1),
            'time' => env('MONTHLY_ANALYTICS_TIME', '08:00'),
        ],
    ],

    'runtime' => [
        'heartbeat_stale_after_seconds' => (int) env('RUNTIME_HEARTBEAT_STALE_AFTER_SECONDS', 300),
        'scheduler_heartbeat_cache_key' => 'rikms:runtime:scheduler-heartbeat',
        'worker_heartbeat_cache_key' => 'rikms:runtime:worker-heartbeat',
    ],

    'uploads' => [
        'quarantine_disk' => env('UPLOAD_QUARANTINE_DISK', 'upload_quarantine'),
        'storage_disk' => env('UPLOAD_STORAGE_DISK', 'private_uploads'),
        'malware_scanner' => env('MALWARE_SCANNER', 'none'),
        'clamav_host' => env('CLAMAV_HOST'),
        'clamav_port' => (int) env('CLAMAV_PORT', 0),
        'clamav_timeout_seconds' => (float) env('CLAMAV_TIMEOUT_SECONDS', 0),
        'clamav_stream_max_length_mb' => (int) env('CLAMAV_STREAM_MAX_LENGTH_MB', 100),
        'pdf_max_text_chars' => (int) env('AI_PDF_MAX_TEXT_CHARS', 200000),
    ],
];
