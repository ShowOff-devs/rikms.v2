<?php

$safeDevelopmentEnvironment = in_array(env('APP_ENV'), ['local', 'testing', 'pilot'], true);

return [
    'dev_seed_accounts' => [
        'allow_outside_safe_environments' => (bool) env('RIKMS_ALLOW_DEV_SEED_ACCOUNTS', false),
        'super_admin_auth_code' => $safeDevelopmentEnvironment
            ? env('RIKMS_DEV_SUPER_ADMIN_AUTH_CODE')
            : null,
    ],
];
