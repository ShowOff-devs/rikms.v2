<?php

return [
    'require_mongodb' => filter_var(env('INFRA_REQUIRE_MONGODB', false), FILTER_VALIDATE_BOOL),
    'require_remote_storage' => filter_var(env('INFRA_REQUIRE_REMOTE_STORAGE', false), FILTER_VALIDATE_BOOL),
    'require_backup_ready' => filter_var(env('INFRA_REQUIRE_BACKUP_READY', false), FILTER_VALIDATE_BOOL),
    'healthcheck_prefix' => trim((string) env('INFRA_HEALTHCHECK_PREFIX', '.rikms-health'), '/'),
];
