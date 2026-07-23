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
            'enabled' => (bool) env('PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED', false),
            'provider' => env('CAPTCHA_PROVIDER', 'turnstile'),
            'site_key' => env('CAPTCHA_SITE_KEY'),
            'secret_key' => env('CAPTCHA_SECRET_KEY'),
            'timeout_seconds' => (float) env('CAPTCHA_VERIFY_TIMEOUT_SECONDS', 3),
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

    'uploads' => [
        'quarantine_disk' => env('UPLOAD_QUARANTINE_DISK', 'local'),
        'storage_disk' => env('UPLOAD_STORAGE_DISK', 'local'),
        'malware_scanner' => env('MALWARE_SCANNER', 'none'),
        'clamav_host' => env('CLAMAV_HOST', '127.0.0.1'),
        'clamav_port' => (int) env('CLAMAV_PORT', 3310),
        'clamav_timeout_seconds' => (float) env('CLAMAV_TIMEOUT_SECONDS', 10),
        'pdf_max_text_chars' => (int) env('AI_PDF_MAX_TEXT_CHARS', 200000),
    ],
];
