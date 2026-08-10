<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Notifications\AccessRequestApprovedNotification;
use App\Notifications\AccessRequestDeniedNotification;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Route;

test('database queue reservation exceeds every configured job timeout', function () {
    $jobs = [
        new ParsePdfDocumentJob(1, 1, 1, 1),
        new ExtractResearchMetadataJob(1, 1, 1, 1),
        new ClassifyResearchSdgJob(1, 1, 1, 1),
    ];
    $retryAfter = (int) config('queue.connections.database.retry_after');

    expect($retryAfter)->toBeGreaterThan(max(array_map(fn (object $job): int => $job->timeout, $jobs)))
        ->and(config('queue.failed.driver'))->toBe('database-uuids')
        ->and(config('queue.failed.table'))->toBe('failed_jobs');
});

test('retryable jobs and notifications have bounded attempts timeouts and backoff', function () {
    $retryable = [
        new ExtractResearchMetadataJob(1, 1, 1, 1),
        new ClassifyResearchSdgJob(1, 1, 1, 1),
        new AccessRequestApprovedNotification([]),
        new AccessRequestDeniedNotification([]),
    ];

    foreach ($retryable as $job) {
        expect($job->tries)->toBe(3)
            ->and($job->timeout)->toBeLessThan(180)
            ->and($job->backoff)->toBe([10, 30, 60]);
    }

    expect((new ParsePdfDocumentJob(1, 1, 1, 1))->tries)->toBe(1);
});

test('scheduler monitors queue depth every minute without overlap', function () {
    $event = collect(app(Schedule::class)->events())
        ->first(fn ($event): bool => str_contains($event->command ?? '', 'queue:monitor database:default --max=100'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('* * * * *')
        ->and($event->withoutOverlapping)->toBeTrue();
});

test('ubuntu worker and scheduler examples preserve graceful operational boundaries', function () {
    $queueUnit = file_get_contents(base_path('deploy/systemd/rikms-queue.service'));
    $schedulerUnit = file_get_contents(base_path('deploy/systemd/rikms-scheduler.service'));
    $schedulerTimer = file_get_contents(base_path('deploy/systemd/rikms-scheduler.timer'));

    expect($queueUnit)
        ->toContain('queue:work database')
        ->toContain('--tries=3')
        ->toContain('--timeout=120')
        ->toContain('ExecReload=/usr/bin/php artisan queue:restart')
        ->toContain('KillSignal=SIGTERM')
        ->toContain('TimeoutStopSec=130')
        ->and($schedulerUnit)->toContain('artisan schedule:run --no-interaction')
        ->and($schedulerTimer)->toContain('OnCalendar=*-*-* *:*:00')
        ->toContain('Persistent=true');
});

test('backup execution remains unavailable instead of exposing an unsafe helper', function () {
    $routeUris = collect(Route::getRoutes()->getRoutes())->map->uri();
    $component = file_get_contents(resource_path('js/components/admin/platform-settings/BackupRecoverySettings.tsx'));

    expect($routeUris->filter(fn (string $uri): bool => str_contains($uri, 'backup')))->toBeEmpty()
        ->and($component)->toContain('Backup Execution Not Configured')
        ->toContain('disabled');
});
