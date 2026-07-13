<?php

$safeDevelopmentEnvironment = in_array(env('APP_ENV'), ['local', 'testing', 'pilot'], true);

return [
    'dev_seed_accounts' => [
        'allow_outside_safe_environments' => (bool) env('RIKMS_ALLOW_DEV_SEED_ACCOUNTS', false),
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
        'force_super_admin_mfa' => (bool) env('RIKMS_FORCE_SUPER_ADMIN_MFA', true),
    ],
];
