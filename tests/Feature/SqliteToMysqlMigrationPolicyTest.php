<?php

use App\Console\Commands\MigrateSqliteToMysql;

test('sqlite to mysql migration includes every persistent event table', function () {
    expect(MigrateSqliteToMysql::PERSISTENT_TABLES)
        ->toContain('security_events')
        ->toContain('research_analytics_events')
        ->toContain('csp_violation_reports');
});

test('sqlite to mysql migration explicitly invalidates unsafe runtime state', function () {
    expect(MigrateSqliteToMysql::EXCLUDED_RUNTIME_TABLES)
        ->toContain('cache')
        ->toContain('cache_locks')
        ->toContain('sessions')
        ->toContain('jobs')
        ->toContain('job_batches')
        ->toContain('failed_jobs')
        ->toContain('password_reset_tokens')
        ->toContain('migrations')
        ->not->toContain('security_events')
        ->not->toContain('research_analytics_events')
        ->not->toContain('csp_violation_reports');
});
