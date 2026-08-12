<?php

return [
    // Execution stays disabled until a real destination and restore drill are approved.
    'execution_enabled' => filter_var(env('BACKUP_EXECUTION_ENABLED', false), FILTER_VALIDATE_BOOL),
    'destination_path' => env('BACKUP_DESTINATION_PATH'),
    'encryption_key' => env('BACKUP_ENCRYPTION_KEY'),
    'minimum_free_space_mb' => (int) env('BACKUP_MINIMUM_FREE_SPACE_MB', 10240),
    'require_separate_filesystem' => filter_var(env('BACKUP_REQUIRE_SEPARATE_FILESYSTEM', true), FILTER_VALIDATE_BOOL),
];
