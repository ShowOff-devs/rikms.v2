<?php

return [
    'alerts_enabled' => filter_var(env('MONITORING_ALERTS_ENABLED', false), FILTER_VALIDATE_BOOL),
    'alert_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => trim($email),
        explode(',', (string) env('MONITORING_ALERT_EMAILS', '')),
    ))),
    'alert_webhook_url' => env('MONITORING_ALERT_WEBHOOK_URL'),
    'alert_timeout_seconds' => (float) env('MONITORING_ALERT_TIMEOUT_SECONDS', 5),
    'alert_cooldown_minutes' => (int) env('MONITORING_ALERT_COOLDOWN_MINUTES', 30),
    'send_recovery_alerts' => filter_var(env('MONITORING_SEND_RECOVERY_ALERTS', true), FILTER_VALIDATE_BOOL),
    'state_path' => env('MONITORING_STATE_PATH', storage_path('app/monitoring/alert-state.json')),
    'require_backup_ready' => filter_var(env('MONITORING_REQUIRE_BACKUP_READY', false), FILTER_VALIDATE_BOOL),
    'thresholds' => [
        'pending_jobs_warning' => (int) env('MONITORING_PENDING_JOBS_WARNING', 100),
        'pending_jobs_critical' => (int) env('MONITORING_PENDING_JOBS_CRITICAL', 500),
        'oldest_job_warning_minutes' => (int) env('MONITORING_OLDEST_JOB_WARNING_MINUTES', 5),
        'oldest_job_critical_minutes' => (int) env('MONITORING_OLDEST_JOB_CRITICAL_MINUTES', 60),
        'failed_jobs_critical' => (int) env('MONITORING_FAILED_JOBS_CRITICAL', 5),
        'disk_warning_percent' => (int) env('MONITORING_DISK_WARNING_PERCENT', 80),
        'disk_critical_percent' => (int) env('MONITORING_DISK_CRITICAL_PERCENT', 90),
        'security_lookback_minutes' => (int) env('MONITORING_SECURITY_LOOKBACK_MINUTES', 15),
    ],
];
